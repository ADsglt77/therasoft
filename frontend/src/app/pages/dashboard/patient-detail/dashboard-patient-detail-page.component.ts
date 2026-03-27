import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiInputComponent } from '../../../components/input/ui-input.component';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { NotificationService } from '../../../core/services/notification.service';
import { PatientService, Dossier, DossierFile } from '../../../core/services/patient.service';
import { ExistingFile } from '../../../components/input/ui-input.component';
import { VoiceRecognitionService, TranscriptionResult } from '../../../core/services/voice-recognition.service';
import { Subscription } from 'rxjs';
import { ApiErrorHandler } from '../../../core/utils/api-error-handler';
import { NotificationMessages } from '../../../core/constants/notification-messages';
import { formatDateLong, formatTime as formatTimeUtil, calculateAge } from '../../../core/utils/date.utils';
import { formatSexe as formatSexeUtil, getSexeIcon } from '../../../core/constants/sexe.constants';
import { formatModalite as formatModaliteUtil } from '../../../core/constants/modalite.constants';

/**
 * Page Patient Detail Dashboard
 * Affiche la fiche complète d'un patient.
 * Observations : saisie au clavier ou transcription vocale (texte uniquement, pas d'enregistrement audio).
 */
@Component({
  selector: 'app-dashboard-patient-detail-page',
  standalone: true,
  imports: [CommonModule, AppIconComponent, UiInputComponent, UiButtonComponent],
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
  isTranscribing = false;
  isTranscriptionSupported = false;
  dossierFiles: DossierFile[] = [];
  isUploadingFiles = false;
  isDeletingFileId: number | null = null;
  clearSelectedTrigger = 0;
  private subscriptions = new Subscription();
  private transcriptSub: Subscription | null = null;
  private transcriptionInitialText = '';
  private saveTimeout: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private notificationService: NotificationService,
    private patientService: PatientService,
    private voiceRecognitionService: VoiceRecognitionService
  ) {}

  ngOnInit(): void {
    this.isTranscriptionSupported = this.voiceRecognitionService.isSupported();

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
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveObservations();
    }
    if (this.transcriptSub) {
      this.transcriptSub.unsubscribe();
      this.transcriptSub = null;
    }
    if (this.isTranscribing) {
      this.voiceRecognitionService.stopTranscription();
      this.isTranscribing = false;
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
        this.dossierFiles = (dossier.files || []).map((f) => ({
          ...f,
          url: `/uploads/dossiers/${f.storedName}`,
        }));
        this.isLoading = false;
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

  formatDate = formatDateLong;
  formatTime = formatTimeUtil;
  getAge = calculateAge;
  formatSexe = formatSexeUtil;
  getSexeIcon = getSexeIcon;
  formatModalite = formatModaliteUtil;

  goBack(): void {
    this.location.back();
  }

  // ========== Gestion des fichiers ==========

  get existingFilesForInput(): ExistingFile[] {
    return this.dossierFiles.map((f) => ({
      id: f.id,
      name: f.originalName,
      size: f.size,
      mimeType: f.mimeType,
    }));
  }

  onFilesSelected(files: File[]): void {
    if (!this.patientId || !this.rdvId || files.length === 0) return;

    this.isUploadingFiles = true;
    const sub = this.patientService
      .uploadDossierFiles(this.patientId, this.rdvId, files)
      .subscribe({
        next: (uploaded) => {
          this.dossierFiles = [...uploaded, ...this.dossierFiles];
          this.clearSelectedTrigger++;
          this.isUploadingFiles = false;
          this.notificationService.show(
            'success',
            `${uploaded.length} fichier(s) ajouté(s) avec succès`
          );
        },
        error: (error) => {
          this.isUploadingFiles = false;
          const extracted = ApiErrorHandler.extractError(error);
          this.notificationService.show(
            'danger',
            extracted.message || 'Erreur lors de l\'upload'
          );
        },
      });
    this.subscriptions.add(sub);
  }

  onFileError(event: { file: File; error: string }): void {
    this.notificationService.show('danger', `${event.file.name} : ${event.error}`);
  }

  onExistingFileDownload(file: ExistingFile): void {
    if (!this.patientId || !this.rdvId) return;

    const sub = this.patientService
      .downloadDossierFile(this.patientId, this.rdvId, file.id as number)
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = file.name;
          anchor.click();
          URL.revokeObjectURL(url);
        },
        error: (error) => {
          const extracted = ApiErrorHandler.extractError(error);
          this.notificationService.show('danger', extracted.message || 'Téléchargement impossible');
        },
      });
    this.subscriptions.add(sub);
  }

  onExistingFilePreview(file: ExistingFile): void {
    if (!this.patientId || !this.rdvId) return;

    const sub = this.patientService
      .downloadDossierFile(this.patientId, this.rdvId, file.id as number)
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        },
        error: (error) => {
          const extracted = ApiErrorHandler.extractError(error);
          this.notificationService.show('danger', extracted.message || 'Prévisualisation impossible');
        },
      });
    this.subscriptions.add(sub);
  }

  onExistingFileRemove(file: ExistingFile): void {
    if (!this.patientId || !this.rdvId) return;

    const fileId = file.id as number;
    this.isDeletingFileId = fileId;
    const sub = this.patientService
      .deleteDossierFile(this.patientId, this.rdvId, fileId)
      .subscribe({
        next: () => {
          this.dossierFiles = this.dossierFiles.filter((f) => f.id !== fileId);
          this.isDeletingFileId = null;
          this.notificationService.show('success', `${file.name} supprimé`);
        },
        error: (error) => {
          this.isDeletingFileId = null;
          const extracted = ApiErrorHandler.extractError(error);
          this.notificationService.show(
            'danger',
            extracted.message || 'Erreur lors de la suppression'
          );
        },
      });
    this.subscriptions.add(sub);
  }

  // ========== Transcription vocale (texte uniquement) ==========

  /**
   * Démarre la transcription vocale : la parole est transcrite en temps réel dans le champ observations.
   */
  startTranscription(): void {
    if (!this.isTranscriptionSupported || this.isTranscribing) return;

    // Mémoriser le texte déjà saisi pour ne pas l'écraser
    this.transcriptionInitialText = this.observationsValue || '';

    if (this.transcriptSub) {
      this.transcriptSub.unsubscribe();
      this.transcriptSub = null;
    }

    this.voiceRecognitionService.startTranscription();
    this.isTranscribing = true;

    this.transcriptSub = this.voiceRecognitionService.transcript$.subscribe(
      (result: TranscriptionResult) => {
        const newTranscript = result.transcript.trim();

        if (!newTranscript) {
          this.observationsValue = this.transcriptionInitialText;
          return;
        }

        const separator = this.transcriptionInitialText ? '\n\n' : '';
        this.observationsValue = `${this.transcriptionInitialText}${separator}${newTranscript}`;
      }
    );

    const errorSub = this.voiceRecognitionService.error$.subscribe((error) => {
      this.isTranscribing = false;
      if (this.transcriptSub) {
        this.transcriptSub.unsubscribe();
        this.transcriptSub = null;
      }
      this.notificationService.show('danger', error?.message || 'Erreur de transcription vocale');
    });
    this.subscriptions.add(errorSub);

    this.notificationService.show('success', 'Transcription vocale démarrée. Parlez dans le micro.');
  }

  /**
   * Arrête la transcription et garde le texte dans les observations.
   */
  stopTranscription(): void {
    if (!this.isTranscribing) return;

    this.voiceRecognitionService.stopTranscription();
    const finalTranscript = this.voiceRecognitionService.getFinalTranscript().trim();

    if (finalTranscript) {
      const separator = this.transcriptionInitialText ? '\n\n' : '';
      this.observationsValue = `${this.transcriptionInitialText}${separator}${finalTranscript}`;
    } else {
      this.observationsValue = this.transcriptionInitialText;
    }

    this.updateObservations(this.observationsValue);
    this.isTranscribing = false;
    this.transcriptionInitialText = '';
    if (this.transcriptSub) {
      this.transcriptSub.unsubscribe();
      this.transcriptSub = null;
    }
    this.notificationService.show('success', 'Transcription arrêtée. Le texte a été conservé.');
  }
}

