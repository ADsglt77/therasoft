import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiBadgeComponent } from '../../../components/badge/ui-badge.component';
import { NavCalendarComponent } from '../../../components/calendar/nav-calendar/nav-calendar.component';
import { TimetableComponent } from '../../../components/timetable/timetable.component';
import { PlanningService, Rdv } from '../../../core/services/planning.service';
import { NotificationService } from '../../../core/services/notification.service';
import { formatTime, formatDateKey } from '../../../core/utils/date.utils';
import { forkJoin } from 'rxjs';
import {
  CalendarDayStatus,
  dayStatusBadgeText,
  dayStatusToBadgeVariant,
  resolveDayStatus,
} from '../../../core/utils/calendar-day-status.utils';
import { BadgeVariant } from '../../../components/badge/ui-badge.component';
import { getModaliteUi } from '../../../core/constants/modalite.constants';

/**
 * Interface pour les slots du timetable
 */
interface TimetableSlot {
  id: string;
  rdvId: number;
  patientId: number;
  iconName: string;
  startTime: string;
  endTime: string;
  title: string;
  disabled: boolean;
  dossierFileCount: number;
  dossierHasObservations: boolean;
  dossierOperationReady: boolean;
  dossierVerified: boolean;
}

type TimelineItem =
  | { kind: 'slot'; id: string; slot: TimetableSlot }
  | { kind: 'gap'; id: string; from: string; to: string; heightPx: number };

/**
 * Page Planning Day Dashboard
 * Affiche le planning pour un jour spécifique
 */
@Component({
  selector: 'app-dashboard-planning-day-page',
  standalone: true,
  imports: [AppIconComponent, UiBadgeComponent, NavCalendarComponent, TimetableComponent],
  templateUrl: './dashboard-planning-day-page.component.html',
  styleUrl: './dashboard-planning-day-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPlanningDayPageComponent {
  day: string | null = null;
  formattedDate: string = '';
  date: Date | null = null;

  timetableSlots: TimetableSlot[] = [];
  vacationSite: string | null = null;
  isLoadingRdvs = false;
  private readonly destroyRef = inject(DestroyRef);
  private readonly timelinePxPerMinute = 0.45;
  private readonly timelineMinGapPx = 16;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private planningService: PlanningService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.day = params.get('date');
      if (this.day) {
        this.parseDate(this.day);
        this.loadRdvs();
      }
      this.cdr.markForCheck();
    });
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

    this.isLoadingRdvs = true;
    this.timetableSlots = [];
    this.vacationSite = null;

    if (this.isWeekend) {
      this.isLoadingRdvs = false;
      return;
    }

    forkJoin({
      rdvs: this.planningService.getMyRdvsForDate(this.date),
      vacations: this.planningService.getVacationsForDate(this.date),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: ({ rdvs, vacations }) => {
        this.vacationSite = vacations.vacations?.[0]?.site ?? null;
        this.timetableSlots = (rdvs.rdvs || []).map((rdv: Rdv) => {
          const ui = getModaliteUi(rdv.modalite);
          return {
            id: rdv.id.toString(),
            rdvId: rdv.id,
            patientId: rdv.patient.id,
            iconName: ui.icon,
            startTime: formatTime(rdv.heureDebut),
            endTime: formatTime(rdv.heureFin),
            title: `${ui.label} - ${rdv.patient.prenom} ${rdv.patient.nom}`,
            disabled: false,
            dossierFileCount: rdv.dossierStatus?.fileCount ?? 0,
            dossierHasObservations: rdv.dossierStatus?.hasObservations ?? false,
            dossierOperationReady: rdv.dossierStatus?.operationReady ?? false,
            dossierVerified: rdv.dossierStatus?.verified ?? false,
          };
        });
        this.isLoadingRdvs = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur lors du chargement du planning:', error);
        this.notificationService.show('danger', 'Erreur lors du chargement du planning');
        this.timetableSlots = [];
        this.vacationSite = null;
        this.isLoadingRdvs = false;
        this.cdr.markForCheck();
      },
    });
  }

  onTimetableActionClick(slotId: string): void {
    const slot = this.timetableSlots.find((s) => s.id === slotId);
    if (slot && this.day) {
      this.router.navigate(['/calendar', this.day, slot.rdvId], {
        state: { patientId: slot.patientId },
      });
    }
  }

  get timelineItems(): TimelineItem[] {
    const sorted = [...this.timetableSlots].sort(
      (a, b) => this.parseHoursToMinutes(a.startTime) - this.parseHoursToMinutes(b.startTime)
    );

    const items: TimelineItem[] = [];
    let previousEnd: number | null = null;

    for (const slot of sorted) {
      const startMin = this.parseHoursToMinutes(slot.startTime);
      const endMin = this.parseHoursToMinutes(slot.endTime);

      if (previousEnd !== null && startMin > previousEnd) {
        const gapMinutes = startMin - previousEnd;
        items.push({
          kind: 'gap',
          id: `gap_${previousEnd}_${startMin}`,
          from: this.minutesToLabel(previousEnd),
          to: this.minutesToLabel(startMin),
          heightPx: Math.max(this.timelineMinGapPx, Math.round(gapMinutes * this.timelinePxPerMinute)),
        });
      }

      items.push({
        kind: 'slot',
        id: slot.id,
        slot,
      });

      previousEnd = Math.max(previousEnd ?? endMin, endMin);
    }

    return items;
  }

  goBack(): void {
    this.router.navigate(['/calendar']);
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

  get dayStatus(): CalendarDayStatus {
    if (!this.date) {
      return 'repos';
    }
    return resolveDayStatus(
      this.date.getFullYear(),
      this.date.getMonth(),
      this.date.getDate(),
      !!this.vacationSite
    );
  }

  get dateBadgeText(): string {
    return dayStatusBadgeText(this.dayStatus, this.vacationSite ?? undefined);
  }

  get badgeVariant(): BadgeVariant {
    return dayStatusToBadgeVariant(this.dayStatus);
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

  private parseHoursToMinutes(time: string): number {
    const match = time.match(/^(\d{2})h(\d{2})$/);
    if (!match) return 0;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }

  private minutesToLabel(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
  }

  previousDay(): void {
    if (!this.date || !this.day) return;
    this.navigateToDate(this.findPreviousWorkingDay(this.date));
  }

  nextDay(): void {
    if (!this.date || !this.day) return;
    this.navigateToDate(this.findNextWorkingDay(this.date));
  }

  /**
   * Retourne le prochain jour ouvré (lundi-vendredi)
   */
  private findNextWorkingDay(from: Date): Date {
    const date = new Date(from);
    do {
      date.setDate(date.getDate() + 1);
    } while (this.isRestDay(date));
    return date;
  }

  /**
   * Retourne le précédent jour ouvré (lundi-vendredi)
   */
  private findPreviousWorkingDay(from: Date): Date {
    const date = new Date(from);
    do {
      date.setDate(date.getDate() - 1);
    } while (this.isRestDay(date));
    return date;
  }

  /**
   * Jour de repos: samedi (6) ou dimanche (0)
   */
  private isRestDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  private navigateToDate(date: Date): void {
    const dateStr = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
    this.router.navigate(['/calendar', dateStr]);
    // Le chargement des rendez-vous sera déclenché automatiquement via paramMap
  }
}

