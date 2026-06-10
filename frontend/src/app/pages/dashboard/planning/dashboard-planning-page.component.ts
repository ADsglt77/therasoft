import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DayCardComponent, DayType } from '../../../components/calendar/month/day-card/day-card.component';
import { NavCalendarComponent } from '../../../components/calendar/nav-calendar/nav-calendar.component';
import { SelectOption } from '../../../components/input/ui-input.component';
import { PlanningService, Vacation, Rdv } from '../../../core/services/planning.service';
import { resolveDayStatus } from '../../../core/utils/calendar-day-status.utils';
import { formatDateKey } from '../../../core/utils/date.utils';
import { NotificationService } from '../../../core/services/notification.service';
import { buildMonthGrid } from '../../../core/utils/calendar-grid.utils';
import { catchError, forkJoin, of } from 'rxjs';

interface DayData {
  dayNumber: number;
  type: DayType;
  location?: string;
  rdvCount: number;
  modalites: string[];
  readyCount: number;
  allVerified: boolean;
  disabled?: boolean;
  isToday?: boolean;
  year: number;
  month: number;
}

const DAYS_PER_WEEK = 7;
const YEAR_RANGE = 5; // Années avant/après l'année actuelle

/**
 * Page Planning Dashboard
 */
@Component({
  selector: 'app-dashboard-planning-page',
  standalone: true,
  imports: [DayCardComponent, NavCalendarComponent],
  templateUrl: './dashboard-planning-page.component.html',
  styleUrl: './dashboard-planning-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPlanningPageComponent implements OnInit {
  // Constantes publiques
  readonly weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;
  // Libellés courts affichés sur tablette / mobile pour éviter le débordement de la grille
  readonly weekDaysShort = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;

  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();

  // Vacations chargées depuis l'API
  private vacationsByDate: Map<string, Vacation[]> = new Map();

  // RDV chargés depuis l'API (pour afficher le nombre sur les cartes jours)
  private rdvsByDate: Map<string, Rdv[]> = new Map();

  private loadVersion = 0;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private planningService: PlanningService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadMonthData();
  }

  get monthName(): string {
    return new Date(this.currentYear, this.currentMonth, 1).toLocaleDateString('fr-FR', {
      month: 'long',
    });
  }

  /**
   * Génère la liste des années disponibles (5 ans avant/après)
   */
  get yearOptions(): SelectOption[] {
    const years: SelectOption[] = [];
    for (let i = this.currentYear - YEAR_RANGE; i <= this.currentYear + YEAR_RANGE; i++) {
      years.push({
        value: i.toString(),
        label: i.toString()
      });
    }
    return years;
  }

  get calendarWeeks(): DayData[][] {
    const all = this.calculateDays();
    const weeks: DayData[][] = [];
    for (let i = 0; i < all.length; i += DAYS_PER_WEEK) {
      weeks.push(all.slice(i, i + DAYS_PER_WEEK));
    }
    return weeks;
  }

  private calculateDays(): DayData[] {
    return buildMonthGrid(this.currentYear, this.currentMonth).map((cell) => {
      const disabled = !cell.inCurrentMonth;
      const dateKey = formatDateKey(cell.year, cell.month, cell.dayNumber);
      const ville = disabled ? undefined : this.vacationsByDate.get(dateKey)?.[0]?.ville;
      const rdvs = disabled ? [] : (this.rdvsByDate.get(dateKey) ?? []);
      const type = resolveDayStatus(
        cell.year,
        cell.month,
        cell.dayNumber,
        Boolean(ville),
        disabled
      );
      return {
        dayNumber: cell.dayNumber,
        type,
        location: type === 'travail' ? ville : undefined,
        rdvCount: rdvs.length,
        modalites: [...new Set(rdvs.map((rdv) => rdv.modalite))],
        readyCount: rdvs.filter((rdv) => rdv.dossierStatus?.operationReady).length,
        allVerified: rdvs.length > 0 && rdvs.every((rdv) => rdv.dossierStatus?.verified),
        disabled,
        isToday: cell.isToday,
        year: cell.year,
        month: cell.month,
      };
    });
  }

  private loadMonthData(): void {
    const version = ++this.loadVersion;
    const year = this.currentYear;
    const month = this.currentMonth;

    forkJoin({
      vacations: this.planningService.getVacationsForMonth(year, month).pipe(
        catchError(() => {
          this.notificationService.show('danger', 'Impossible de charger les vacations');
          return of({ vacations: [], count: 0 });
        })
      ),
      rdvs: this.planningService.getRdvsForMonth(year, month).pipe(
        catchError(() => {
          this.notificationService.show('danger', 'Impossible de charger les rendez-vous');
          return of({ rdvs: [], count: 0 });
        })
      ),
    }).subscribe(({ vacations, rdvs }) => {
      if (version !== this.loadVersion) {
        return;
      }
      this.vacationsByDate = this.indexByDate(vacations.vacations);
      this.rdvsByDate = this.indexByDate(rdvs.rdvs);
      this.cdr.markForCheck();
    });
  }

  private indexByDate<T extends { date: string }>(items: T[]): Map<string, T[]> {
    const result = new Map<string, T[]>();
    items.forEach((item) => {
      const dateKey = item.date.substring(0, 10);
      const entries = result.get(dateKey) ?? [];
      entries.push(item);
      result.set(dateKey, entries);
    });
    return result;
  }

  private refreshMonth(): void {
    this.loadMonthData();
    this.cdr.markForCheck();
  }

  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.refreshMonth();
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.refreshMonth();
  }

  onYearChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newYear = parseInt(select.value, 10);
    if (!isNaN(newYear) && newYear !== this.currentYear) {
      this.currentYear = newYear;
      this.refreshMonth();
    }
  }

  trackByDay(_index: number, day: DayData): string {
    return `${day.year}-${day.month}-${day.dayNumber}`;
  }

  /**
   * Gère le clic sur un jour
   */
  onDayClick(event: { year: number; month: number; day: number }): void {
    // Formater la date au format YYYY-MM-DD pour la route
    const dateStr = formatDateKey(event.year, event.month, event.day);

    // Naviguer vers la page planning-day
    this.router.navigate(['/calendar', dateStr]);
  }
}

