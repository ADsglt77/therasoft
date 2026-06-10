import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { FeedbackCardComponent, FeedbackVariant } from '../../../components/feedback-card/feedback-card.component';
import { AuthService } from '../../../core/services/auth.service';

type VerifyState = 'loading' | 'success' | 'error';

interface VerifyView {
  icon: string;
  variant: FeedbackVariant;
  title: string;
  message: string;
  cta: { label: string; route: string } | null;
}

/**
 * Page publique de vérification d'email : lit le jeton du lien reçu,
 * confirme l'adresse côté serveur et affiche le résultat.
 */
@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [UiButtonComponent, RouterLink, FeedbackCardComponent],
  templateUrl: './verify-email-page.component.html',
  host: { style: 'display: block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPageComponent implements OnInit {
  state: VerifyState = 'loading';
  errorMessage = 'Lien de vérification invalide ou expiré.';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  get view(): VerifyView {
    switch (this.state) {
      case 'success':
        return {
          icon: 'check',
          variant: 'success',
          title: 'Adresse email vérifiée',
          message: 'Votre compte est activé : vous pouvez maintenant prendre rendez-vous.',
          cta: { label: 'Prendre rendez-vous', route: '/prendre-rendez-vous' },
        };
      case 'error':
        return {
          icon: 'x',
          variant: 'error',
          title: 'Vérification impossible',
          message: this.errorMessage,
          cta: { label: 'Aller à la connexion', route: '/login' },
        };
      default:
        return {
          icon: 'clock',
          variant: 'info',
          title: 'Vérification en cours…',
          message: 'Merci de patienter quelques instants.',
          cta: null,
        };
    }
  }

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state = 'error';
      this.errorMessage = 'Lien de vérification invalide.';
      return;
    }
    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.state = 'success';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.state = 'error';
        this.errorMessage = err?.error?.error?.message || 'Lien de vérification invalide ou expiré.';
        this.cdr.markForCheck();
      },
    });
  }
}
