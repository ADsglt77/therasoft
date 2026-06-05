import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { UiBadgeComponent } from '../badge/ui-badge.component';
import { AppIconComponent } from '../icon/app-icon.component';

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
  imports: [UiBadgeComponent, AppIconComponent],
  templateUrl: './timetable.component.html',
  styleUrl: './timetable.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimetableComponent {
  @Input() startTime: string = '';
  @Input() endTime: string = '';
  @Input() title: string = '';
  @Input() iconName: string = 'info';
  @Input() disabled: boolean = false;
  @Input() compact: boolean = false;
  @Input() dossierFileCount = 0;
  @Input() dossierHasObservations = false;
  @Input() dossierOperationReady = false;
  @Input() dossierVerified = false;

  @Output() actionClick = new EventEmitter<void>();

  get filesTooltip(): string {
    const n = this.dossierFileCount;
    if (n === 0) {
      return 'Aucun document';
    }
    return n === 1 ? '1 fichier' : `${n} fichiers`;
  }

  get observationsTooltip(): string {
    return this.dossierHasObservations
      ? 'Observations renseignées'
      : 'Observations manquantes';
  }

  get validateTooltip(): string {
    return this.dossierOperationReady
      ? 'Dossier complet pour l\'opération'
      : 'Dossier incomplet';
  }

  @HostBinding('class.compact')
  get isCompact(): boolean {
    return this.compact;
  }

  onActionClick(): void {
    if (!this.disabled) {
      this.actionClick.emit();
    }
  }
}
