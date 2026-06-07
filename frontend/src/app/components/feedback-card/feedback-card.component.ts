import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AppIconComponent } from '../icon/app-icon.component';

export type FeedbackVariant = 'info' | 'success' | 'error';

/**
 * Carte centrée plein écran (icône + titre + message) pour les écrans d'état :
 * vérification d'email, mot de passe oublié, réinitialisation…
 * Le contenu additionnel (boutons, formulaire) est projeté via <ng-content>.
 */
@Component({
  selector: 'app-feedback-card',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './feedback-card.component.html',
  styleUrl: './feedback-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedbackCardComponent {
  @Input({ required: true }) icon!: string;
  @Input() variant: FeedbackVariant = 'info';
  @Input() iconSize = 30;
  @Input() title = '';
  @Input() message = '';
}
