import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiInputComponent, InputMessageType } from '../../../components/input/ui-input.component';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { PasswordStrengthIndicatorComponent } from '../../../components/password-strength-indicator/password-strength-indicator.component';
import { AuthService } from '../../../core/services/auth.service';
import { PasswordValidator } from '../../../core/validators/password.validator';
import { InputErrorMessages } from '../../../core/utils/input-error-messages';
import { ApiErrorHandler } from '../../../core/utils/api-error-handler';
import { FormUtils } from '../../../core/utils/form-utils';

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
    AppIconComponent,
    UiInputComponent,
    UiButtonComponent,
    PasswordStrengthIndicatorComponent,
  ],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
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
    private router: Router
  ) {
    this.form = this.fb.group(
      {
        newPassword: ['', [Validators.required, PasswordValidator.strong()]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
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

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    if (confirmPassword && confirmPassword.hasError('passwordMismatch')) {
      confirmPassword.setErrors(null);
    }
    return null;
  }

  get newPasswordValue(): string {
    return this.form.get('newPassword')?.value || '';
  }

  get newPasswordMessage(): { message: string; type: InputMessageType | '' } {
    return InputErrorMessages.getInputMessage(this.form, 'newPassword', {
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
    const control = this.form.get(field);
    control?.setValue(value);
    control?.markAsTouched();
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }
    if (this.form.invalid) {
      FormUtils.markFormGroupTouched(this.form);
      return;
    }
    this.isLoading = true;
    this.authService.resetPassword(this.token, this.form.value.newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.state = 'success';
      },
      error: (err) => {
        this.isLoading = false;
        const extracted = ApiErrorHandler.extractError(err);
        if (extracted.code === 'AUTH_RESET_TOKEN_INVALID') {
          this.state = 'invalid';
        } else {
          this.form.get('newPassword')?.setErrors({ serverError: extracted.message || 'Réinitialisation impossible' });
          this.form.get('newPassword')?.markAsTouched();
        }
      },
    });
  }

  goLogin(): void {
    this.router.navigate(['/login']);
  }
}
