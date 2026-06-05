import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { AppIconComponent } from '../../../icon/app-icon.component';
import { UiBadgeComponent, BadgeVariant } from '../../../badge/ui-badge.component';
import {
  CalendarDayStatus,
  dayStatusBadgeText,
  dayStatusToBadgeVariant,
} from '../../../../core/utils/calendar-day-status.utils';

export type DayType = CalendarDayStatus;

@Component({
  selector: 'app-day-card',
  standalone: true,
  imports: [AppIconComponent, UiBadgeComponent],
  templateUrl: './day-card.component.html',
  styleUrl: './day-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayCardComponent {
  @Input() dayNumber!: number;
  @Input() type: DayType = 'repos';
  @Input() location?: string; // Lieu de travail si type = 'travail'
  @Input() rdvCount: number = 0;
  @Input() disabled: boolean = false; // true pour les jours du mois précédent/suivant
  @Input() isToday: boolean = false; // true si c'est le jour actuel
  @Input() year?: number; // Année du jour
  @Input() month?: number; // Mois du jour (0-11)
  @Output() dayClick = new EventEmitter<{ year: number; month: number; day: number }>();

  @HostBinding('class')
  get hostClasses(): string {
    let classes = 'day-card-component';
    if (this.disabled) {
      classes += ' day-card-component--disabled';
    }
    if (this.isToday) {
      classes += ' day-card-component--today';
    }
    if (!this.disabled) {
      classes += ' day-card-component--clickable';
    }
    return classes;
  }

  get badgeText(): string {
    return dayStatusBadgeText(this.type, this.location);
  }

  get badgeVariant(): BadgeVariant {
    return dayStatusToBadgeVariant(this.type);
  }

  onDayClick(): void {
    if (!this.disabled && this.year !== undefined && this.month !== undefined) {
      this.dayClick.emit({
        year: this.year,
        month: this.month,
        day: this.dayNumber
      });
    }
  }
}



