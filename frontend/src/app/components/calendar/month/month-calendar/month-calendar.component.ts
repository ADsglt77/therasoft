import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NavCalendarComponent } from '../../nav-calendar/nav-calendar.component';
import { DayCardComponent } from '../day-card/day-card.component';
import { SelectOption } from '../../../input/ui-input.component';
import { buildMonthGrid, MonthGridCell } from '../../../../core/utils/calendar-grid.utils';
import { formatDateKey } from '../../../../core/utils/date.utils';

const YEAR_RANGE = 2;

/**
 * Calendrier mois réutilisable (réutilise `app-nav-calendar` + `app-day-card`).
 * Seules les dates de `availableDates` sont cliquables ; émet `dateSelect` (YYYY-MM-DD).
 */
@Component({
  selector: 'app-month-calendar',
  standalone: true,
  imports: [NavCalendarComponent, DayCardComponent],
  templateUrl: './month-calendar.component.html',
  styleUrl: './month-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthCalendarComponent {
  @Input() availableDates: Set<string> = new Set();
  @Output() dateSelect = new EventEmitter<string>();
  @Output() monthChange = new EventEmitter<{ year: number; month: number }>();

  readonly weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;
  readonly weekDaysShort = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;

  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();

  get monthName(): string {
    return new Date(this.currentYear, this.currentMonth, 1).toLocaleDateString('fr-FR', { month: 'long' });
  }

  get yearOptions(): SelectOption[] {
    const years: SelectOption[] = [];
    for (let y = this.currentYear - YEAR_RANGE; y <= this.currentYear + YEAR_RANGE; y++) {
      years.push({ value: y.toString(), label: y.toString() });
    }
    return years;
  }

  get weeks(): MonthGridCell[][] {
    const cells = buildMonthGrid(this.currentYear, this.currentMonth);
    const weeks: MonthGridCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }

  isAvailable(cell: MonthGridCell): boolean {
    return cell.inCurrentMonth && this.availableDates.has(cell.dateKey);
  }

  trackCell(_index: number, cell: MonthGridCell): string {
    return cell.dateKey;
  }

  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.emitMonth();
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.emitMonth();
  }

  onYearChange(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value;
    const year = Number(value);
    if (value && !Number.isNaN(year) && year !== this.currentYear) {
      this.currentYear = year;
      this.emitMonth();
    }
  }

  /** day-card n'émet que pour les jours non désactivés (donc disponibles). */
  onDayClick(event: { year: number; month: number; day: number }): void {
    this.dateSelect.emit(formatDateKey(event.year, event.month, event.day));
  }

  private emitMonth(): void {
    this.monthChange.emit({ year: this.currentYear, month: this.currentMonth });
  }
}
