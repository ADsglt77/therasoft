import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiInputComponent } from '../../../components/input/ui-input.component';
import { NotificationService } from '../../../core/services/notification.service';
import { PatientService, Dossier } from '../../../core/services/patient.service';
import { Subscription } from 'rxjs';
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
  imports: [CommonModule, AppIconComponent, UiInputComponent],
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
  private subscriptions = new Subscription();
  private saveTimeout: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private notificationService: NotificationService,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
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
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        const extracted = ApiErrorHandler.extractError(error);
        this.notificationService.show('danger', extracted.message || NotificationMessages.GENERIC_ERROR);
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
}

