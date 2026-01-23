import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiBadgeComponent } from '../../../components/badge/ui-badge.component';
import { NavCalendarComponent } from '../../../components/calendar/nav-calendar/nav-calendar.component';
import { TimetableComponent } from '../../../components/timetable/timetable.component';
import { UiLoaderComponent } from '../../../components/loader/ui-loader.component';
import { PlanningService, Rdv } from '../../../core/services/planning.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Subscription } from 'rxjs';

/**
 * Interface pour les slots du timetable
 */
interface TimetableSlot {
  id: string;
  rdvId: number;
  patientId: number;
  startTime: string;
  endTime: string;
  title: string;
  disabled: boolean;
}

/**
 * Page Planning Day Dashboard
 * Affiche le planning pour un jour spécifique
 */
@Component({
  selector: 'app-dashboard-planning-day-page',
  standalone: true,
  imports: [CommonModule, AppIconComponent, UiBadgeComponent, NavCalendarComponent, TimetableComponent, UiLoaderComponent],
  templateUrl: './dashboard-planning-day-page.component.html',
  styleUrl: './dashboard-planning-day-page.component.scss',
})
export class DashboardPlanningDayPageComponent implements OnInit, OnDestroy {
  day: string | null = null;
  formattedDate: string = '';
  date: Date | null = null;
  
  timetableSlots: TimetableSlot[] = [];
  isLoadingRdvs = false;
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private planningService: PlanningService,
    private notificationService: NotificationService
  ) {
    this.route.paramMap.subscribe(params => {
      this.day = params.get('day');
      if (this.day) {
        this.parseDate(this.day);
        this.loadRdvs();
      }
    });
  }

  ngOnInit(): void {
    // Le chargement est déjà géré dans le constructeur via paramMap
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  parseDate(dateStr: string): void {
    // Format attendu: YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Les mois sont 0-indexés
      const day = parseInt(parts[2], 10);
      
      this.date = new Date(year, month, day);
      this.formattedDate = this.date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  loadRdvs(): void {
    if (!this.date) return;

    // Ne pas charger les rendez-vous les weekends
    if (this.isWeekend) {
      this.isLoadingRdvs = false;
      this.timetableSlots = [];
      return;
    }

    this.isLoadingRdvs = true;
    this.timetableSlots = []; // Réinitialiser avant le chargement
    const sub = this.planningService.getMyRdvsForDate(this.date).subscribe({
      next: (response) => {
        this.timetableSlots = (response.rdvs || []).map((rdv: Rdv) => {
          return {
            id: rdv.id.toString(),
            rdvId: rdv.id,
            patientId: rdv.patient.id,
            startTime: this.planningService.formatTime(rdv.heureDebut),
            endTime: this.planningService.formatTime(rdv.heureFin),
            title: `${rdv.modalite} - ${rdv.patient.prenom} ${rdv.patient.nom}`,
            disabled: false,
          };
        });
        this.isLoadingRdvs = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des rendez-vous:', error);
        this.notificationService.show('danger', 'Erreur lors du chargement des rendez-vous');
        this.timetableSlots = []; // S'assurer que c'est un tableau vide en cas d'erreur
        this.isLoadingRdvs = false;
      },
    });
    this.subscriptions.add(sub);
  }

  onTimetableActionClick(slotId: string): void {
    const slot = this.timetableSlots.find((s) => s.id === slotId);
    if (slot) {
      // Naviguer vers le dossier du patient pour ce RDV spécifique
      this.router.navigate(['/dashboard/patient', slot.patientId, 'rdv', slot.rdvId]);
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard/planning']);
  }

  get isToday(): boolean {
    if (!this.date) return false;
    const today = new Date();
    return this.date.toDateString() === today.toDateString();
  }

  get isWeekend(): boolean {
    if (!this.date) return false;
    const dayOfWeek = this.date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  get daysDifference(): number | null {
    if (!this.date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(this.date);
    selectedDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - selectedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  get dateBadgeText(): string {
    if (this.isWeekend) return 'Jour de repos';
    
    const days = this.daysDifference;
    if (days === null) return '';
    if (days === 0) return 'Aujourd\'hui';
    if (days > 0) {
      // Passé
      if (days === 1) return 'Il y a 1 jour';
      return `Il y a ${days} jours`;
    } else {
      // Futur
      const daysFuture = Math.abs(days);
      if (daysFuture === 1) return 'Dans 1 jour';
      return `Dans ${daysFuture} jours`;
    }
  }

  get badgeVariant(): 'success' | 'repos' {
    if (this.isToday) return 'success';
    return 'repos';
  }

  get monthName(): string {
    if (!this.date) return '';
    return this.date.toLocaleDateString('fr-FR', { month: 'long' });
  }

  get dayOfWeek(): string {
    if (!this.date) return '';
    return this.date.toLocaleDateString('fr-FR', { weekday: 'long' });
  }

  get dayNumber(): number {
    if (!this.date) return 0;
    return this.date.getDate();
  }

  previousDay(): void {
    if (!this.date || !this.day) return;
    const newDate = new Date(this.date);
    newDate.setDate(newDate.getDate() - 1);
    this.navigateToDate(newDate);
  }

  nextDay(): void {
    if (!this.date || !this.day) return;
    const newDate = new Date(this.date);
    newDate.setDate(newDate.getDate() + 1);
    this.navigateToDate(newDate);
  }

  private navigateToDate(date: Date): void {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    this.router.navigate(['/dashboard/planning', dateStr]);
    // Le chargement des rendez-vous sera déclenché automatiquement via paramMap
  }
}

