import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiBadgeComponent } from '../badge/ui-badge.component';

/**
 * Composant Timetable - Affiche un créneau horaire avec une carte d'information
 * 
 * @example
 * ```html
 * @for (slot of slots; track slot.id) {
 *   <app-timetable
 *     [startTime]="slot.startTime"
 *     [endTime]="slot.endTime"
 *     [title]="slot.title"
 *     [disabled]="slot.disabled"
 *     (actionClick)="onActionClick(slot)">
 *   </app-timetable>
 * }
 * ```
 */
@Component({
  selector: 'app-timetable',
  standalone: true,
  imports: [CommonModule, UiBadgeComponent],
  templateUrl: './timetable.component.html',
  styleUrl: './timetable.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimetableComponent {
  @Input() startTime: string = '';
  @Input() endTime: string = '';
  @Input() title: string = '';
  @Input() disabled: boolean = false;

  @Output() actionClick = new EventEmitter<void>();

  onActionClick(): void {
    if (!this.disabled) {
      this.actionClick.emit();
    }
  }
}
