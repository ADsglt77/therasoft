import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiInputComponent } from '../../../components/input/ui-input.component';
import { UiInputVocalComponent, VocalState } from '../../../components/input-vocal/ui-input-vocal.component';
import { UiAudioRecordingsListComponent } from '../../../components/audio-recordings-list/ui-audio-recordings-list.component';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { NotificationService } from '../../../core/services/notification.service';
import { PatientService, Dossier, AudioRecording } from '../../../core/services/patient.service';
import { AudioRecordingService, AudioRecordingResult } from '../../../core/services/audio-recording.service';
import { VoiceRecognitionService, TranscriptionResult } from '../../../core/services/voice-recognition.service';
import { Subscription, firstValueFrom } from 'rxjs';
import { ApiErrorHandler } from '../../../core/utils/api-error-handler';
import { NotificationMessages } from '../../../core/constants/notification-messages';
import { formatDateLong, formatTime as formatTimeUtil, calculateAge } from '../../../core/utils/date.utils';
import { formatSexe as formatSexeUtil, getSexeIcon } from '../../../core/constants/sexe.constants';
import { formatModalite as formatModaliteUtil } from '../../../core/constants/modalite.constants';
import { parseDocumentsList } from '../../../core/utils/string.utils';

/**
 * Page Patient Detail Dashboard
 * Affiche la fiche complète d'un patient
 */
@Component({
  selector: 'app-dashboard-patient-detail-page',
  standalone: true,
  imports: [CommonModule, AppIconComponent, UiInputComponent, UiInputVocalComponent, UiAudioRecordingsListComponent, UiButtonComponent],
  templateUrl: './dashboard-patient-detail-page.component.html',
  styleUrl: './dashboard-patient-detail-page.component.scss',
})
export class DashboardPatientDetailPageComponent implements OnInit, OnDestroy {
  patientId: number | null = null;
  rdvId: number | null = null;
  isLoading = true;
  dossier: Dossier | null = null;
  observationsValue = '';
  isSavingObservations = false;
  audioRecordings: AudioRecording[] = []; // Liste des enregistrements audio
  @ViewChild(UiInputVocalComponent) vocalComponent?: UiInputVocalComponent;
  isRecordingNamePromptOpen = false;
  recordingName = '';
  private pendingRecording: AudioRecordingResult | null = null;
  private subscriptions = new Subscription();
  private saveTimeout: any;
  private transcriptionEnabled = true; // Transcription optionnelle (peut être désactivée)
  private currentTranscript = '';
  audioPlayer: HTMLAudioElement | null = null; // Player audio HTML5 (public pour le template)

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private notificationService: NotificationService,
    private patientService: PatientService,
    private audioRecordingService: AudioRecordingService,
    private voiceRecognitionService: VoiceRecognitionService
  ) {}

  ngOnInit(): void {
    // Vérifier le support des APIs au démarrage
    this.checkBrowserSupport();

    const sub = this.route.paramMap.subscribe((params) => {
      const patientIdParam = params.get('patientId');
      const rdvIdParam = params.get('rdvId');

      if (!patientIdParam || !rdvIdParam) {
        this.notificationService.show('danger', 'Paramètres manquants');
        this.router.navigate(['/dashboard/planning']);
        return;
      }

      const patientId = parseInt(patientIdParam, 10);
      const rdvId = parseInt(rdvIdParam, 10);

      if (isNaN(patientId) || isNaN(rdvId)) {
        this.notificationService.show('danger', 'ID patient ou RDV invalide');
        this.router.navigate(['/dashboard/planning']);
        return;
      }

      this.patientId = patientId;
      this.rdvId = rdvId;
      this.loadPatientData();
    });

    this.subscriptions.add(sub);
  }

  ngOnDestroy(): void {
    // Sauvegarder avant de quitter si nécessaire
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveObservations();
    }
    this.subscriptions.unsubscribe();
  }

  loadPatientData(): void {
    if (!this.patientId || !this.rdvId) return;

    this.isLoading = true;
    this.dossier = null;

    const sub = this.patientService.getDossier(this.patientId, this.rdvId).subscribe({
      next: (dossier) => {
        this.dossier = dossier;
        this.observationsValue = dossier.observations || '';
        // Charger les enregistrements audio
        this.loadAudioRecordings();
        this.isLoading = false;
        
        // Afficher une notification si aucun résultat n'est enregistré
        if (!dossier.resultats) {
          this.notificationService.show('information', 'Aucun résultat enregistré pour ce dossier');
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.dossier = null;
        const extracted = ApiErrorHandler.extractError(error);
        this.notificationService.show('danger', 'Impossible de charger le dossier médical');
      },
    });

    this.subscriptions.add(sub);
  }

  /**
   * Met à jour la valeur des observations et sauvegarde automatiquement
   */
  updateObservations(value: string): void {
    this.observationsValue = value;
    
    // Annuler le timeout précédent s'il existe
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Sauvegarder automatiquement après 1 seconde d'inactivité (debounce)
    this.saveTimeout = setTimeout(() => {
      this.saveObservations();
    }, 1000);
  }

  /**
   * Sauvegarde les observations (appelée au blur ou après debounce)
   */
  saveObservations(): void {
    if (!this.patientId || !this.rdvId || !this.dossier) return;
    if (this.isSavingObservations) return;
    
    // Vérifier si la valeur a changé
    if (this.observationsValue === (this.dossier.observations || '')) {
      return; // Pas de changement, pas besoin de sauvegarder
    }

    this.isSavingObservations = true;

    const sub = this.patientService
      .updateObservations(this.patientId, this.rdvId, this.observationsValue)
      .subscribe({
        next: (updatedDossier) => {
          this.dossier = updatedDossier;
          this.observationsValue = updatedDossier.observations || '';
          this.isSavingObservations = false;
          this.notificationService.show('success', 'Observations mises à jour avec succès');
        },
        error: (error) => {
          this.isSavingObservations = false;
          // Restaurer la valeur précédente en cas d'erreur
          this.observationsValue = this.dossier?.observations || '';
          const extracted = ApiErrorHandler.extractError(error);
          this.notificationService.show('danger', extracted.message || NotificationMessages.GENERIC_ERROR);
        },
      });

    this.subscriptions.add(sub);
  }

  /**
   * Sauvegarde immédiate au blur
   */
  onObservationsBlur(): void {
    // Annuler le timeout et sauvegarder immédiatement
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveObservations();
  }

  // Méthodes utilitaires exposées pour le template
  formatDate = formatDateLong;
  formatTime = formatTimeUtil;
  getAge = calculateAge;
  formatSexe = formatSexeUtil;
  getSexeIcon = getSexeIcon;
  formatModalite = formatModaliteUtil;
  getDocumentsList = parseDocumentsList;

  goBack(): void {
    this.location.back();
  }

  // ============================================
  // Méthodes pour le composant vocal
  // ============================================

  /**
   * Démarre l'enregistrement vocal
   */
  async onStartRecording(): Promise<void> {
    if (!this.audioRecordingService.isSupported()) {
      this.notificationService.show('danger', 'L\'enregistrement audio n\'est pas supporté par votre navigateur');
      return;
    }

    try {
      // Démarrer l'enregistrement audio
      await this.audioRecordingService.startRecording(300); // 5 minutes max

      // Démarrer la transcription si supportée et activée
      if (this.transcriptionEnabled && this.voiceRecognitionService.isSupported()) {
        this.voiceRecognitionService.startTranscription();
        
        // Écouter les transcriptions
        const transcriptSub = this.voiceRecognitionService.transcript$.subscribe({
          next: (result: TranscriptionResult) => {
            this.currentTranscript = result.transcript;
            // Optionnel : mettre à jour le textarea avec la transcription en temps réel
            // this.observationsValue = result.transcript;
          },
          error: (error) => {
            console.error('Erreur de transcription:', error);
            // Ne pas bloquer l'enregistrement si la transcription échoue
          },
        });
        this.subscriptions.add(transcriptSub);
      }

      // Écouter la durée de l'enregistrement
      const durationSub = this.audioRecordingService.duration$.subscribe((duration) => {
        // Mettre à jour la durée dans le composant vocal
        if (this.vocalComponent) {
          this.vocalComponent.currentDuration = duration;
        }
      });
      this.subscriptions.add(durationSub);

      // Écouter le volume audio pour l'indicateur visuel
      const volumeSub = this.audioRecordingService.volume$.subscribe((volume) => {
        if (this.vocalComponent) {
          this.vocalComponent.currentVolume = volume;
        }
      });
      this.subscriptions.add(volumeSub);

      // Le composant vocal gère déjà son état 'recording' via onStartRecording()
      this.notificationService.show('success', 'Enregistrement démarré. Parlez maintenant...');
    } catch (error: any) {
      // Messages d'erreur améliorés selon le type d'erreur
      let errorMessage = error.message || 'Erreur lors du démarrage de l\'enregistrement';
      
      if (error.message?.includes('Permission') || error.message?.includes('refusé')) {
        errorMessage = 'Accès au microphone refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur et réessayer.';
      } else if (error.message?.includes('microphone') || error.message?.includes('trouvé')) {
        errorMessage = 'Aucun microphone détecté. Veuillez connecter un microphone et réessayer.';
      } else if (error.message?.includes('utilisé')) {
        errorMessage = 'Le microphone est déjà utilisé par une autre application. Veuillez fermer les autres applications et réessayer.';
      } else if (error.message?.includes('supporté')) {
        errorMessage = 'L\'enregistrement audio n\'est pas supporté par votre navigateur. Veuillez utiliser Chrome, Edge ou Firefox récent.';
      }
      
      this.notificationService.show('danger', errorMessage);
      
      // Mettre à jour l'état du composant vocal en 'idle' en cas d'erreur
      if (this.vocalComponent) {
        this.vocalComponent.setState('idle');
      }
    }
  }

  /**
   * Arrête l'enregistrement vocal
   */
  async onStopRecording(): Promise<void> {
    try {
      // Arrêter la transcription si active
      if (this.voiceRecognitionService.isTranscribing()) {
        this.voiceRecognitionService.stopTranscription();
        this.currentTranscript = this.voiceRecognitionService.getFinalTranscript();
      }

      // Mettre à jour l'état du composant vocal en 'processing'
      if (this.vocalComponent) {
        this.vocalComponent.setState('processing');
      }

      // Arrêter l'enregistrement audio
      const result = await this.audioRecordingService.stopRecording();
      this.pendingRecording = result;

      // Demander le nom de l'enregistrement avant de sauvegarder
      this.isRecordingNamePromptOpen = true;
      this.recordingName = `Enregistrement ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

      this.notificationService.show('success', 'Enregistrement terminé. Veuillez le nommer.');
    } catch (error: any) {
      this.handleError(error, 'Erreur lors de l\'arrêt de l\'enregistrement');
      if (this.vocalComponent) {
        this.vocalComponent.setState('idle');
      }
    }
  }

  /**
   * Annule l'enregistrement vocal
   */
  onCancelRecording(): void {
    // Arrêter la transcription si active
    if (this.voiceRecognitionService.isTranscribing()) {
      this.voiceRecognitionService.cancelTranscription();
    }

    // Annuler l'enregistrement audio
    this.audioRecordingService.cancelRecording();
    this.currentTranscript = '';

    // Mettre à jour l'état du composant vocal en 'idle'
    if (this.vocalComponent) {
      this.vocalComponent.setState('idle');
    }

    this.notificationService.show('information', 'Enregistrement annulé');
  }


  /**
   * Confirme et sauvegarde l'enregistrement audio avec nom
   */
  async confirmSaveRecording(): Promise<void> {
    if (!this.pendingRecording || !this.recordingName.trim()) {
      this.cancelSaveRecording();
      return;
    }

    const name = this.recordingName.trim();
    this.isRecordingNamePromptOpen = false;

    try {
      await this.saveAudioRecording(this.pendingRecording, name);
      this.pendingRecording = null;
      this.recordingName = '';
    } catch (error) {
      // L'erreur est déjà gérée dans saveAudioRecording
    }
  }

  /**
   * Annule la sauvegarde de l'enregistrement
   */
  cancelSaveRecording(): void {
    this.isRecordingNamePromptOpen = false;
    this.pendingRecording = null;
    this.recordingName = '';
    this.currentTranscript = '';

    if (this.vocalComponent) {
      this.vocalComponent.setState('idle');
    }

    this.notificationService.show('information', 'Enregistrement annulé');
  }

  /**
   * Sauvegarde l'enregistrement audio avec nom (nouveau système)
   */
  private async saveAudioRecording(result: AudioRecordingResult, name: string): Promise<void> {
    if (!this.patientId || !this.rdvId) return;

    try {
      // Convertir le Blob en base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(result.audioBlob);
      });

      const mimeType = result.mimeType || 'audio/webm';

      // Créer l'enregistrement avec nom via la nouvelle API
      const recording = await firstValueFrom(
        this.patientService.createAudioRecording(
          this.patientId,
          this.rdvId,
          {
            name,
            audio: base64Audio,
            mimeType,
            duration: result.duration,
            transcript: this.currentTranscript || undefined,
          }
        )
      );

      if (!recording) {
        throw new Error('Aucune réponse du serveur');
      }

      // Recharger la liste des enregistrements
      await this.loadAudioRecordings();

      // Mettre à jour l'état du composant vocal en 'idle'
      if (this.vocalComponent) {
        this.vocalComponent.setState('idle');
      }

      // Optionnel : ajouter la transcription au textarea
      if (this.currentTranscript && this.transcriptionEnabled) {
        if (this.observationsValue) {
          this.observationsValue += '\n\n' + this.currentTranscript;
        } else {
          this.observationsValue = this.currentTranscript;
        }
        // Sauvegarder les observations avec la transcription
        this.saveObservations();
      }

      this.notificationService.show('success', `Enregistrement "${name}" sauvegardé`);
    } catch (error: any) {
      this.handleError(error, 'Erreur lors de la sauvegarde de l\'enregistrement');
      if (this.vocalComponent) {
        this.vocalComponent.setState('idle');
      }
    }
  }

  /**
   * Charge la liste des enregistrements audio
   */
  private async loadAudioRecordings(): Promise<void> {
    if (!this.patientId || !this.rdvId) return;

    try {
      const recordings = await firstValueFrom(
        this.patientService.getAudioRecordings(this.patientId, this.rdvId)
      );
      this.audioRecordings = recordings || [];
    } catch (error: any) {
      console.error('Erreur lors du chargement des enregistrements:', error);
      this.audioRecordings = [];
    }
  }

  /**
   * Retourne l'ID de l'enregistrement actuellement en cours de lecture
   */
  getCurrentlyPlayingId(): number | null {
    if (this.audioPlayer && !this.audioPlayer.paused && (this.audioPlayer as any).recordingId) {
      return (this.audioPlayer as any).recordingId;
    }
    return null;
  }

  /**
   * Formate la durée en MM:SS
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Vérifie le support des APIs du navigateur
   */
  private checkBrowserSupport(): void {
    const issues: string[] = [];

    // Vérifier MediaRecorder API
    if (!this.audioRecordingService.isSupported()) {
      issues.push('L\'enregistrement audio n\'est pas supporté par votre navigateur. Veuillez utiliser Chrome, Edge ou Firefox récent.');
    }

    // Vérifier Web Speech API (optionnel - pas d'alerte car optionnel)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.info('La transcription vocale n\'est pas disponible sur ce navigateur (fonctionnalité optionnelle)');
    }

    // Vérifier HTTPS (sauf localhost)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      issues.push('L\'accès au microphone nécessite une connexion HTTPS. Veuillez utiliser HTTPS ou localhost.');
    }

    // Afficher les avertissements si nécessaire
    if (issues.length > 0) {
      console.warn('Problèmes de compatibilité détectés:', issues);
      // Ne pas bloquer l'utilisateur, juste informer via console
    }
  }

  // ========== Gestion des enregistrements audio ==========

  /**
   * Joue un enregistrement audio
   */
  async onPlayRecording(recording: AudioRecording): Promise<void> {
    if (!this.patientId || !this.rdvId) return;

    try {
      // Si le même enregistrement est déjà en cours de lecture, mettre en pause
      if (this.audioPlayer && !this.audioPlayer.paused && (this.audioPlayer as any).recordingId === recording.id) {
        this.audioPlayer.pause();
        this.loadAudioRecordings();
        return;
      }

      // Arrêter la lecture en cours si nécessaire
      this.stopCurrentPlayback();

      // Récupérer et jouer le fichier audio
      const audioBlob = await firstValueFrom(
        this.patientService.getAudioRecordingFile(this.patientId, this.rdvId, recording.id)
      );

      await this.playAudioFile(audioBlob, recording.id);
      this.loadAudioRecordings();
    } catch (error: any) {
      this.handleError(error, 'Erreur lors de la lecture de l\'enregistrement');
    }
  }

  /**
   * Met en pause un enregistrement audio
   */
  onPauseRecording(recording: AudioRecording): void {
    if (this.audioPlayer && !this.audioPlayer.paused && (this.audioPlayer as any).recordingId === recording.id) {
      this.audioPlayer.pause();
      this.loadAudioRecordings();
    }
  }

  /**
   * Supprime un enregistrement audio
   */
  async onDeleteRecording(recording: AudioRecording): Promise<void> {
    if (!this.patientId || !this.rdvId) return;

    try {
      await firstValueFrom(
        this.patientService.deleteAudioRecordingById(this.patientId, this.rdvId, recording.id)
      );

      // Arrêter la lecture si c'est l'enregistrement en cours
      if (this.audioPlayer && (this.audioPlayer as any).recordingId === recording.id) {
        this.stopCurrentPlayback();
      }

      await this.loadAudioRecordings();
      this.notificationService.show('success', `Enregistrement "${recording.name}" supprimé`);
    } catch (error: any) {
      this.handleError(error, 'Erreur lors de la suppression');
    }
  }

  /**
   * Renomme un enregistrement audio
   */
  async onRenameRecording(event: { recording: AudioRecording; newName: string }): Promise<void> {
    if (!this.patientId || !this.rdvId) return;

    try {
      await firstValueFrom(
        this.patientService.updateAudioRecordingName(
          this.patientId,
          this.rdvId,
          event.recording.id,
          event.newName
        )
      );

      await this.loadAudioRecordings();
      this.notificationService.show('success', 'Nom de l\'enregistrement mis à jour');
    } catch (error: any) {
      this.handleError(error, 'Erreur lors de la mise à jour du nom');
    }
  }

  // ========== Méthodes privées utilitaires ==========

  /**
   * Joue un fichier audio
   */
  private async playAudioFile(audioBlob: Blob, recordingId: number): Promise<void> {
    const audioUrl = URL.createObjectURL(audioBlob);
    this.audioPlayer = new Audio(audioUrl);
    (this.audioPlayer as any).recordingId = recordingId;
    (this.audioPlayer as any).audioUrl = audioUrl;
    
    // Gérer les événements audio
    this.audioPlayer.addEventListener('ended', () => this.cleanupAudioPlayer(audioUrl));
    this.audioPlayer.addEventListener('error', () => {
      this.handleError(new Error('Erreur de lecture audio'), 'Erreur lors de la lecture de l\'enregistrement');
      this.cleanupAudioPlayer(audioUrl);
    });
    this.audioPlayer.addEventListener('pause', () => this.loadAudioRecordings());

    await this.audioPlayer.play();
  }

  /**
   * Arrête la lecture en cours
   */
  private stopCurrentPlayback(): void {
    if (this.audioPlayer && !this.audioPlayer.paused) {
      this.audioPlayer.pause();
      URL.revokeObjectURL((this.audioPlayer as any).audioUrl);
      this.audioPlayer = null;
    }
  }

  /**
   * Nettoie le player audio
   */
  private cleanupAudioPlayer(audioUrl: string): void {
    URL.revokeObjectURL(audioUrl);
    this.audioPlayer = null;
    this.loadAudioRecordings();
  }

  /**
   * Gère les erreurs de manière uniforme
   */
  private handleError(error: any, defaultMessage: string): void {
    console.error(defaultMessage, error);
    const extracted = ApiErrorHandler.extractError(error);
    this.notificationService.show('danger', extracted.message || defaultMessage);
  }
}

