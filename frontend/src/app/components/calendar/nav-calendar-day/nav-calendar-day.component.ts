import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../icon/app-icon.component';

@Component({
  selector: 'app-nav-calendar-day',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './nav-calendar-day.component.html',
  styleUrl: './nav-calendar-day.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavCalendarDayComponent {
  @Input() dayOfWeek: string = '';
  @Input() monthName: string = '';

  @Output() previousDay = new EventEmitter<void>();
  @Output() nextDay = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();

  onPreviousDay(): void {
    this.previousDay.emit();
  }

  onNextDay(): void {
    this.nextDay.emit();
  }

  onGoBack(): void {
    this.goBack.emit();
  }
}

