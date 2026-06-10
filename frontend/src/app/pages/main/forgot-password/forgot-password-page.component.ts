import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UiInputComponent, InputMessageType } from '../../../components/input/ui-input.component';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { FeedbackCardComponent } from '../../../components/feedback-card/feedback-card.component';
import { AuthService } from '../../../core/services/auth.service';
import { markFormTouched } from '../../../core/utils/form-utils';

/**
 * Page « Mot de passe oublié » : saisie de l'email → envoi d'un lien de réinitialisation.
 * Réponse anti-énumération : même message que l'email existe ou non.
 */
@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, UiInputComponent, UiButtonComponent, FeedbackCardComponent],
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './forgot-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPageComponent {
  sent = false;
  isLoading = false;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get emailMessage(): { message: string; type: InputMessageType | '' } {
    const c = this.form.get('email');
    if (c && (c.touched || c.dirty)) {
      if (c.hasError('required')) return { message: "L'email est requis", type: 'error' };
      if (c.hasError('email')) return { message: 'Email invalide', type: 'error' };
    }
    return { message: '', type: '' };
  }

  updateEmail(value: string): void {
    this.form.get('email')?.setValue(value);
    this.form.get('email')?.markAsTouched();
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }
    if (this.form.invalid) {
      markFormTouched(this.form);
      return;
    }
    this.isLoading = true;
    this.authService.forgotPassword(this.form.value.email).subscribe({
      // Anti-énumération : succès quel que soit le résultat.
      next: () => {
        this.isLoading = false;
        this.sent = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.sent = true;
        this.cdr.markForCheck();
      },
    });
  }
}
