import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiBadgeComponent } from '../../badge/ui-badge.component';

export type DayType = 'repos' | 'travail';

@Component({
  selector: 'app-day-card',
  standalone: true,
  imports: [CommonModule, UiBadgeComponent],
  templateUrl: './day-card.component.html',
  styleUrl: './day-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayCardComponent {
  @Input() dayNumber!: number;
  @Input() type: DayType = 'repos';
  @Input() location?: string; // Lieu de travail si type = 'travail'
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
    if (this.type === 'travail' && this.location) {
      return this.location;
    }
    return this.type === 'repos' ? 'Repos' : 'Travail';
  }

  get badgeVariant(): 'repos' | 'success' {
    return this.type === 'repos' ? 'repos' : 'success';
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



