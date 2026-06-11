import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { AppIconComponent } from '../icon/app-icon.component';
import { buildMonthGrid, MonthGridCell } from '../../core/utils/calendar-grid.utils';
import { parseDateKey } from '../../core/utils/date.utils';

export type DatePickerMessageType = 'error' | 'info' | 'success' | 'warning';

/**
 * Date picker maison (sans `<input type="date">` natif).
 * Champ déclencheur + panneau calendrier (vue jours / vue années) construit sur
 * `buildMonthGrid`. Émet la date au format `YYYY-MM-DD` via `valueChange`, et
 * calque l'API d'affichage (label, message, touched/dirty) de `ui-input` pour
 * s'intégrer aux formulaires existants.
 */
@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './ui-date-picker.component.html',
  styleUrl: './ui-date-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiDatePickerComponent implements OnChanges {
  @Input() label = '';
  @Input() value = ''; // YYYY-MM-DD
  @Input() placeholder = 'Choisir une date';
  @Input() id = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() max = ''; // YYYY-MM-DD : jour maximal sélectionnable
  @Input() min = ''; // YYYY-MM-DD : jour minimal sélectionnable
  @Input() minYear = 1900;
  @Input() message = '';
  @Input() messageType: DatePickerMessageType | '' = '';
  @Input() touched = false;
  @Input() dirty = false;

  @Output() valueChange = new EventEmitter<string>();

  /** Initiales des jours (lundi → dimanche). */
  readonly weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;
  private readonly monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  isOpen = false;
  view: 'days' | 'years' = 'days';
  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth();
  yearPageStart = this.viewYear - (this.viewYear % 12);

  private computedMessage = '';
  private computedMessageType: DatePickerMessageType | '' = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['max']) {
      this.syncViewToValue();
    }
    if (changes['value'] || changes['required'] || changes['touched'] || changes['dirty']) {
      this.computeAutoMessage();
    }
    this.cdr.markForCheck();
  }

  // ---- Champ déclencheur ----
  get displayValue(): string {
    const date = parseDateKey(this.value);
    return date
      ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : '';
  }

  get controlId(): string {
    return `${this.id || 'date-picker'}-trigger`;
  }

  toggle(): void {
    if (this.disabled) {
      return;
    }
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.view = 'days';
      this.syncViewToValue();
    }
    this.cdr.markForCheck();
  }

  close(): void {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  // ---- Vue jours ----
  get monthLabel(): string {
    return `${this.monthNames[this.viewMonth]} ${this.viewYear}`;
  }

  get grid(): MonthGridCell[] {
    return buildMonthGrid(this.viewYear, this.viewMonth);
  }

  prevMonth(): void {
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear--;
    } else {
      this.viewMonth--;
    }
    this.cdr.markForCheck();
  }

  nextMonth(): void {
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear++;
    } else {
      this.viewMonth++;
    }
    this.cdr.markForCheck();
  }

  isDisabledCell(cell: MonthGridCell): boolean {
    if (this.max && cell.dateKey > this.max) {
      return true;
    }
    return !!this.min && cell.dateKey < this.min;
  }

  isSelectedCell(cell: MonthGridCell): boolean {
    return !!this.value && cell.dateKey === this.value;
  }

  selectDay(cell: MonthGridCell): void {
    if (this.isDisabledCell(cell)) {
      return;
    }
    this.value = cell.dateKey;
    this.computeAutoMessage();
    this.valueChange.emit(this.value);
    this.close();
  }

  // ---- Vue années ----
  openYearView(): void {
    this.view = 'years';
    this.yearPageStart = this.viewYear - (this.viewYear % 12);
    this.cdr.markForCheck();
  }

  get years(): number[] {
    return Array.from({ length: 12 }, (_, i) => this.yearPageStart + i);
  }

  get yearRangeLabel(): string {
    return `${this.yearPageStart} – ${this.yearPageStart + 11}`;
  }

  prevYears(): void {
    this.yearPageStart -= 12;
    this.cdr.markForCheck();
  }

  nextYears(): void {
    this.yearPageStart += 12;
    this.cdr.markForCheck();
  }

  selectYear(year: number): void {
    this.viewYear = year;
    this.view = 'days';
    this.cdr.markForCheck();
  }

  isYearDisabled(year: number): boolean {
    if (year < this.minYear) {
      return true;
    }
    return !!this.max && year > Number(this.max.slice(0, 4));
  }

  isSelectedYear(year: number): boolean {
    return year === this.viewYear;
  }

  // ---- Messages (calque ui-input) ----
  private computeAutoMessage(): void {
    if (this.message && this.messageType) {
      this.computedMessage = this.message;
      this.computedMessageType = this.messageType;
      return;
    }
    if (this.required && !this.value && (this.touched || this.dirty)) {
      this.computedMessage = 'Ce champ est requis';
      this.computedMessageType = 'error';
      return;
    }
    this.computedMessage = '';
    this.computedMessageType = '';
  }

  get hasMessage(): boolean {
    return !!this.displayMessage;
  }

  get displayMessage(): string {
    return this.message || this.computedMessage;
  }

  get displayMessageType(): DatePickerMessageType | '' {
    return this.messageType || this.computedMessageType;
  }

  // Centre la vue (jours/années) sur la valeur sélectionnée, sinon sur `max`, sinon aujourd'hui.
  private syncViewToValue(): void {
    const base = parseDateKey(this.value) ?? parseDateKey(this.max) ?? new Date();
    this.viewYear = base.getFullYear();
    this.viewMonth = base.getMonth();
    this.yearPageStart = this.viewYear - (this.viewYear % 12);
  }
}
