import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '../button/ui-button.component';

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
 *     [compact]="slot.compact"
 *     (actionClick)="onActionClick(slot)">
 *   </app-timetable>
 * }
 * ```
 */
@Component({
  selector: 'app-timetable',
  standalone: true,
  imports: [CommonModule, UiButtonComponent],
  templateUrl: './timetable.component.html',
  styleUrl: './timetable.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimetableComponent {
  @Input() startTime: string = '';
  @Input() endTime: string = '';
  @Input() title: string = '';
  @Input() disabled: boolean = false;
  @Input() compact: boolean = false;

  @Output() actionClick = new EventEmitter<void>();

  onActionClick(): void {
    if (!this.disabled) {
      this.actionClick.emit();
    }
  }
}
