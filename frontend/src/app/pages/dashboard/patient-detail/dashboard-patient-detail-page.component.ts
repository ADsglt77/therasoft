import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiInputComponent } from '../../../components/input/ui-input.component';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { UiBadgeComponent } from '../../../components/badge/ui-badge.component';
import { NotificationService } from '../../../core/services/notification.service';
import {
  PatientService,
  Dossier,
  DossierFile,
  DossierOperationStatus,
} from '../../../core/services/patient.service';
import { ExistingFile } from '../../../components/input/ui-input.component';
import { VoiceRecognitionService } from '../../../core/services/voice-recognition.service';
import { Subscription } from 'rxjs';
import { extractApiError } from '../../../core/utils/errors';
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
  imports: [AppIconComponent, UiInputComponent, UiButtonComponent, UiBadgeComponent],
  templateUrl: './dashboard-patient-detail-page.component.html',
  styleUrl: './dashboard-patient-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPatientDetailPageComponent implements OnInit, OnDestroy {
  patientId: number | null = null;
  rdvId: number | null = null;
  isLoading = true;
  dossier: Dossier | null = null;
  observationsValue = '';
  isSavingObservations = false;
  isSavingVerified = false;
  isTranscribing = false;
  isTranscriptionSupported = false;
  dossierFiles: DossierFile[] = [];
  isUploadingFiles = false;
  isDeletingFileId: number | null = null;
  clearSelectedTrigger = 0;
  /** Zone observations/fichiers en pleine hauteur uniquement sur desktop large */
  isWideLayout = false;
  private subscriptions = new Subscription();
  private transcriptSub: Subscription | null = null;
  private transcriptionInitialText = '';
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private saveRequested = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private notificationService: NotificationService,
    private patientService: PatientService,
    private voiceRecognitionService: VoiceRecognitionService,
    private cdr: ChangeDetectorRef
  ) {}

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateLayoutMode();
  }

  /** Bascule le statut « vérifié / complet » du dossier (décision du médecin). */
  toggleVerified(): void {
    if (!this.dossier || this.patientId === null || this.rdvId === null || this.isSavingVerified) {
      return;
    }
    const newValue = !this.dossier.verified;
    if (newValue && !this.dossier.operationReady) {
      this.notificationService.show(
        'warning',
        'Ajoutez des observations et au moins un fichier avant de vérifier le dossier'
      );
      return;
    }
    this.isSavingVerified = true;
    this.patientService.setVerified(this.patientId, this.rdvId, newValue).subscribe({
      next: (updated) => {
        this.dossier = updated;
        this.isSavingVerified = false;
        this.notificationService.show(
          'success',
          newValue ? 'Dossier marqué comme vérifié' : 'Dossier marqué comme non vérifié'
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSavingVerified = false;
        this.notificationService.show('danger', 'Impossible de mettre à jour le statut du dossier');
        this.cdr.markForCheck();
      },
    });
  }

  ngOnInit(): void {
    this.updateLayoutMode();
    this.isTranscriptionSupported = this.voiceRecognitionService.isSupported();

    this.subscriptions.add(
      this.voiceRecognitionService.error$.subscribe((error) => this.onTranscriptionError(error))
    );

    const sub = this.route.paramMap.subscribe((params) => {
      const date = params.get('date');
      const rdvIdParam = params.get('rdvId');
      const patientIdParam = params.get('patientId');
      const patientIdFromState = history.state?.patientId as number | undefined;

      if (!date || !rdvIdParam) {
        this.notificationService.show('danger', 'Paramètres manquants');
        this.router.navigate(['/calendar']);
        return;
      }

      const rdvId = parseInt(rdvIdParam, 10);
      const patientId = patientIdParam ? Number(patientIdParam) : patientIdFromState;

      if (isNaN(rdvId)) {
        this.notificationService.show('danger', 'ID de rendez-vous invalide');
        this.router.navigate(['/calendar', date]);
        return;
      }

      if (!patientId || !Number.isInteger(patientId) || patientId <= 0) {
        this.notificationService.show('warning', 'Dossier inaccessible depuis ce lien');
        this.router.navigate(['/calendar', date]);
        return;
      }

      this.patientId = patientId;
      this.rdvId = rdvId;
      this.loadPatientData();
      this.cdr.markForCheck();
    });

    this.subscriptions.add(sub);
  }

  ngOnDestroy(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
      this.flushPendingObservations();
    }
    this.clearTranscriptSub();
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
        this.dossierFiles = dossier.files || [];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.dossier = null;
        this.notificationService.show('danger', 'Impossible de charger le dossier médical');
        this.cdr.markForCheck();
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
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (this.isSavingObservations) {
      this.saveRequested = true;
      return;
    }
    
    // Vérifier si la valeur a changé
    if (this.observationsValue === (this.dossier.observations || '')) {
      return; // Pas de changement, pas besoin de sauvegarder
    }

    this.isSavingObservations = true;
    this.saveRequested = false;
    const submittedValue = this.observationsValue;
    const previousServerValue = this.dossier.observations || '';

    const sub = this.patientService
      .updateObservations(this.patientId, this.rdvId, submittedValue)
      .subscribe({
        next: (updatedDossier) => {
          const wasReady = this.dossier?.operationReady ?? false;
          const hasNewerLocalValue = this.observationsValue !== submittedValue;
          this.dossier = updatedDossier;
          if (!hasNewerLocalValue) {
            this.observationsValue = updatedDossier.observations || '';
          }
          this.isSavingObservations = false;
          if (updatedDossier.operationReady && !wasReady) {
            this.notificationService.show(
              'success',
              'Dossier complet : prêt pour l\'opération'
            );
          } else {
            this.notificationService.show('success', 'Observations mises à jour avec succès');
          }
          if (hasNewerLocalValue || this.saveRequested) {
            this.saveRequested = false;
            this.saveTimeout = setTimeout(() => this.saveObservations(), 0);
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isSavingObservations = false;
          this.saveRequested = false;
          if (this.observationsValue === submittedValue) {
            this.observationsValue = previousServerValue;
          }
          const extracted = extractApiError(error);
          this.notificationService.show('danger', extracted.message || 'Une erreur est survenue');
          this.cdr.markForCheck();
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

  /** Une seule date affichée : modification si le dossier a changé, sinon création */
  get dossierTimestamp(): { label: string; date: string } | null {
    if (!this.dossier) return null;
    const created = new Date(this.dossier.createdAt).getTime();
    const updated = new Date(this.dossier.updatedAt).getTime();
    if (updated > created + 1000) {
      return { label: 'Modifié le', date: this.dossier.updatedAt };
    }
    return { label: 'Créé le', date: this.dossier.createdAt };
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

  private applyOperationStatus(status: DossierOperationStatus): boolean {
    if (!this.dossier) {
      return false;
    }
    const wasReady = this.dossier.operationReady;
    this.dossier = {
      ...this.dossier,
      operationReady: status.operationReady,
      operationReadyAt: status.operationReadyAt,
      verified: status.verified,
    };
    return status.operationReady && !wasReady;
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
        next: (response) => {
          this.dossierFiles = [...response.files, ...this.dossierFiles];
          const becameReady = this.applyOperationStatus(response);
          this.clearSelectedTrigger++;
          this.isUploadingFiles = false;
          if (becameReady) {
            this.notificationService.show(
              'success',
              'Dossier complet : prêt pour l\'opération'
            );
          } else {
            this.notificationService.show(
              'success',
              `${response.files.length} fichier(s) ajouté(s) avec succès`
            );
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isUploadingFiles = false;
          const extracted = extractApiError(error);
          this.notificationService.show(
            'danger',
            extracted.message || 'Erreur lors de l\'upload'
          );
          this.cdr.markForCheck();
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
          const extracted = extractApiError(error);
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
          const extracted = extractApiError(error);
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
        next: (status) => {
          this.dossierFiles = this.dossierFiles.filter((f) => f.id !== fileId);
          this.applyOperationStatus(status);
          this.isDeletingFileId = null;
          this.notificationService.show('success', `${file.name} supprimé`);
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isDeletingFileId = null;
          const extracted = extractApiError(error);
          this.notificationService.show(
            'danger',
            extracted.message || 'Erreur lors de la suppression'
          );
          this.cdr.markForCheck();
        },
      });
    this.subscriptions.add(sub);
  }

  // ========== Transcription vocale (texte uniquement) ==========

  /**
   * Démarre la transcription vocale : la parole alimente le champ observations
   * en temps réel, sans écraser le texte déjà saisi.
   */
  startTranscription(): void {
    if (!this.isTranscriptionSupported || this.isTranscribing) return;

    this.transcriptionInitialText = this.observationsValue || '';
    this.clearTranscriptSub();

    this.voiceRecognitionService.startTranscription();
    this.isTranscribing = true;

    this.transcriptSub = this.voiceRecognitionService.transcript$.subscribe((transcript) => {
      this.observationsValue = this.composeObservations(transcript.trim());
      this.cdr.markForCheck();
    });

    this.notificationService.show('success', 'Transcription vocale démarrée. Parlez dans le micro.');
  }

  /**
   * Arrête la transcription et conserve le texte transcrit dans les observations.
   */
  stopTranscription(): void {
    if (!this.isTranscribing) return;

    this.voiceRecognitionService.stopTranscription();
    this.observationsValue = this.composeObservations(
      this.voiceRecognitionService.getFinalTranscript().trim()
    );
    this.updateObservations(this.observationsValue);

    this.isTranscribing = false;
    this.transcriptionInitialText = '';
    this.clearTranscriptSub();

    this.notificationService.show('success', 'Transcription arrêtée. Le texte a été conservé.');
  }

  /** Concatène le texte initial et le texte transcrit (séparés si les deux existent). */
  private composeObservations(transcript: string): string {
    if (!transcript) {
      return this.transcriptionInitialText;
    }
    const separator = this.transcriptionInitialText ? '\n\n' : '';
    return `${this.transcriptionInitialText}${separator}${transcript}`;
  }

  /** Coupe l'abonnement aux résultats de transcription. */
  private clearTranscriptSub(): void {
    this.transcriptSub?.unsubscribe();
    this.transcriptSub = null;
  }

  /** Réagit à une erreur émise par le service de transcription. */
  private onTranscriptionError(error: Error): void {
    if (!this.isTranscribing) return;
    this.isTranscribing = false;
    this.clearTranscriptSub();
    this.notificationService.show('danger', error?.message || 'Erreur de transcription vocale');
    this.cdr.markForCheck();
  }

  private updateLayoutMode(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.isWideLayout = window.innerWidth > 1024;
  }

  private flushPendingObservations(): void {
    if (
      !this.patientId ||
      !this.rdvId ||
      !this.dossier ||
      this.observationsValue === (this.dossier.observations || '')
    ) {
      return;
    }
    this.patientService
      .updateObservations(this.patientId, this.rdvId, this.observationsValue)
      .subscribe({ error: () => undefined });
  }
}

