import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { AuthService } from '../../../core/services/auth.service';

type VerifyState = 'loading' | 'success' | 'error';

/**
 * Page publique de vérification d'email : lit le jeton du lien reçu,
 * confirme l'adresse côté serveur et affiche le résultat.
 */
@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [AppIconComponent, UiButtonComponent, RouterLink],
  templateUrl: './verify-email-page.component.html',
  styleUrl: './verify-email-page.component.scss',
})
export class VerifyEmailPageComponent implements OnInit {
  state: VerifyState = 'loading';
  message = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state = 'error';
      this.message = 'Lien de vérification invalide.';
      return;
    }
    this.authService.verifyEmail(token).subscribe({
      next: () => (this.state = 'success'),
      error: (err) => {
        this.state = 'error';
        this.message = err?.error?.error?.message || 'Lien de vérification invalide ou expiré.';
      },
    });
  }
}
