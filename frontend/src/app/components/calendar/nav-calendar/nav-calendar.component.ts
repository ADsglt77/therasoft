import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AppIconComponent } from '../../icon/app-icon.component';
import { UiInputComponent, SelectOption } from '../../input/ui-input.component';

export type CalendarMode = 'day' | 'month';

@Component({
  selector: 'app-nav-calendar',
  standalone: true,
  imports: [AppIconComponent, UiInputComponent],
  templateUrl: './nav-calendar.component.html',
  styleUrl: './nav-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavCalendarComponent {
  @Input() mode: CalendarMode = 'month';
  
  // Mode day
  @Input() dayOfWeek: string = '';
  @Input() monthName: string = '';
  @Input() dayNumber: number = 0;
  
  // Mode month
  @Input() currentYear: number = new Date().getFullYear();
  @Input() yearOptions: SelectOption[] = [];

  // Outputs
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() yearChange = new EventEmitter<Event>();
  @Output() goBack = new EventEmitter<void>();

  /**
   * Retourne le format de date complet pour le mode day : "Lundi 19 Janvier"
   */
  get formattedDate(): string {
    if (this.mode !== 'day' || !this.dayOfWeek || !this.monthName || !this.dayNumber) {
      return this.dayOfWeek || '';
    }
    return `${this.dayOfWeek} ${this.dayNumber} ${this.monthName}`;
  }

  /**
   * Retourne le texte à afficher dans la section centrale
   */
  get centerText(): string {
    return this.mode === 'day' ? this.formattedDate : this.monthName;
  }

  /**
   * Retourne la classe CSS pour la section centrale
   */
  get centerClass(): string {
    return this.mode === 'day' ? 'day' : 'month';
  }

  onPrevious(): void {
    this.previous.emit();
  }

  onNext(): void {
    this.next.emit();
  }

  onYearChange(event: Event): void {
    this.yearChange.emit(event);
  }

  onGoBack(): void {
    this.goBack.emit();
  }
}

