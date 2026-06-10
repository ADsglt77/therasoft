import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UiInputComponent, InputMessageType } from '../../../components/input/ui-input.component';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { FeedbackCardComponent } from '../../../components/feedback-card/feedback-card.component';
import { PasswordStrengthIndicatorComponent } from '../../../components/password-strength-indicator/password-strength-indicator.component';
import { AuthService } from '../../../core/services/auth.service';
import { PasswordValidator } from '../../../core/validators/password.validator';
import { extractApiError, getInputMessage } from '../../../core/utils/errors';
import { markFormTouched, updateControl } from '../../../core/utils/form-utils';
import { matchingFieldsValidator } from '../../../core/validators/matching-fields.validator';

type ResetState = 'form' | 'success' | 'invalid';

/**
 * Page de réinitialisation : lit le jeton du lien, saisie d'un nouveau mot de passe.
 */
@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    UiInputComponent,
    UiButtonComponent,
    FeedbackCardComponent,
    PasswordStrengthIndicatorComponent,
  ],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPageComponent implements OnInit {
  state: ResetState = 'form';
  isLoading = false;
  form: FormGroup;
  private token = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group(
      {
        newPassword: ['', [Validators.required, PasswordValidator.strong()]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: matchingFieldsValidator('newPassword', 'confirmPassword') }
    );
  }

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state = 'invalid';
      return;
    }
    this.token = token;
  }

  get newPasswordValue(): string {
    return this.form.get('newPassword')?.value || '';
  }

  get newPasswordMessage(): { message: string; type: InputMessageType | '' } {
    return getInputMessage(this.form, 'newPassword', {
      showWarningForPassword: true,
      passwordMinLength: 12,
    });
  }

  get confirmPasswordMessage(): { message: string; type: InputMessageType | '' } {
    const c = this.form.get('confirmPassword');
    if (c && (c.touched || c.dirty)) {
      if (c.hasError('required')) return { message: 'La confirmation est requise', type: 'error' };
      if (c.hasError('passwordMismatch')) return { message: 'Les mots de passe ne correspondent pas', type: 'error' };
    }
    return { message: '', type: '' };
  }

  update(field: string, value: string): void {
    updateControl(this.form, field, value);
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
    this.authService.resetPassword(this.token, this.form.value.newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.state = 'success';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        const extracted = extractApiError(err);
        if (extracted.code === 'AUTH_RESET_TOKEN_INVALID') {
          this.state = 'invalid';
        } else {
          this.form.get('newPassword')?.setErrors({ serverError: extracted.message || 'Réinitialisation impossible' });
          this.form.get('newPassword')?.markAsTouched();
        }
        this.cdr.markForCheck();
      },
    });
  }

}
