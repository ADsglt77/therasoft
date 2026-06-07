import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AppIconComponent } from '../icon/app-icon.component';

export interface StepperStep {
  label: string;
  /** Valeur choisie (affichée sous le libellé une fois l'étape complétée). */
  value?: string | null;
  done: boolean;
}

/**
 * Indicateur de progression d'un parcours en étapes (wizard).
 * Affiche l'étape courante, les étapes terminées (✓) et celles à venir.
 * Les étapes au-delà de `maxReachable` sont verrouillées.
 */
@Component({
  selector: 'ui-stepper',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './ui-stepper.component.html',
  styleUrl: './ui-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiStepperComponent {
  @Input() steps: StepperStep[] = [];
  @Input() current = 0;
  @Input() maxReachable = 0;
  @Output() stepSelect = new EventEmitter<number>();

  select(index: number): void {
    if (index <= this.maxReachable && index !== this.current) {
      this.stepSelect.emit(index);
    }
  }
}
