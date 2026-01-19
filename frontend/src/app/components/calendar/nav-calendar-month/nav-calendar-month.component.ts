import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../icon/app-icon.component';
import { UiInputComponent, SelectOption } from '../../input/ui-input.component';

@Component({
  selector: 'app-nav-calendar-month',
  standalone: true,
  imports: [CommonModule, AppIconComponent, UiInputComponent],
  templateUrl: './nav-calendar-month.component.html',
  styleUrl: './nav-calendar-month.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavCalendarMonthComponent {
  @Input() monthName: string = '';
  @Input() currentYear: number = new Date().getFullYear();
  @Input() yearOptions: SelectOption[] = [];

  @Output() previousMonth = new EventEmitter<void>();
  @Output() nextMonth = new EventEmitter<void>();
  @Output() yearChange = new EventEmitter<Event>();

  onPreviousMonth(): void {
    this.previousMonth.emit();
  }

  onNextMonth(): void {
    this.nextMonth.emit();
  }

  onYearChange(event: Event): void {
    this.yearChange.emit(event);
  }
}



