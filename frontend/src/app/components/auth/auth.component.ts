import { ChangeDetectionStrategy, Component, HostBinding, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { UiButtonComponent } from '../button/ui-button.component';
import { UiInputComponent, InputMessageType } from '../input/ui-input.component';
import { PasswordStrengthIndicatorComponent } from '../password-strength-indicator/password-strength-indicator.component';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { InputErrorMessages } from '../../core/utils/input-error-messages';
import { ApiErrorHandler } from '../../core/utils/api-error-handler';
import { NotificationMessages } from '../../core/constants/notification-messages';
import { FormUtils } from '../../core/utils/form-utils';
import { PasswordValidator } from '../../core/validators/password.validator';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, UiButtonComponent, UiInputComponent, PasswordStrengthIndicatorComponent],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class AuthComponent implements OnInit {
  isLoginMode = true;
  isLoading = false;

  loginForm: FormGroup;
  registerForm: FormGroup;

  @HostBinding('class')
  get hostClasses(): string {
    return 'auth';
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {
    // Formulaire de connexion
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });

    // Formulaire d'inscription
    this.registerForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      prenom: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.minLength(3), Validators.maxLength(100)]],
      password: ['', [Validators.required, PasswordValidator.strong()]],
      confirmPassword: ['', [Validators.required]],
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    const currentPath = this.router.url;
    
    // Vérifier que l'accès se fait uniquement via /login ou /register
    if (currentPath !== '/login' && currentPath !== '/register') {
      // Rediriger vers /login si accès non autorisé
      this.router.navigate(['/login']);
      return;
    }

    // Déterminer le mode selon l'URL
    this.isLoginMode = currentPath === '/login';
    
    // Si l'utilisateur est déjà authentifié, rediriger vers le dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/calendar']);
      return;
    }

    // Pré-remplir l'email si passé en query param (après inscription)
    this.route.queryParams.subscribe(params => {
      if (params['email'] && this.isLoginMode) {
        this.loginForm.patchValue({ email: params['email'] });
      }
    });
  }

  /**
   * Validateur personnalisé pour vérifier que les mots de passe correspondent
   */
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    if (confirmPassword && confirmPassword.hasError('passwordMismatch')) {
      confirmPassword.setErrors(null);
    }
    
    return null;
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    // Réinitialiser les formulaires
    this.loginForm.reset();
    this.registerForm.reset();

    // Naviguer vers l'autre route
    const targetRoute = this.isLoginMode ? '/login' : '/register';
    this.router.navigate([targetRoute]);
  }

  onSubmit(): void {
    if (this.isLoading) return;

    if (this.isLoginMode) {
      this.handleLogin();
    } else {
      this.handleRegister();
    }
  }

  private handleLogin(): void {
    if (this.loginForm.invalid) {
      FormUtils.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    // Réinitialiser les erreurs serveur
    this.loginForm.get('email')?.setErrors(null);
    this.loginForm.get('password')?.setErrors(null);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationService.show('success', NotificationMessages.AUTH_LOGIN_SUCCESS);
        
        // Rediriger vers le dashboard
        this.router.navigate(['/calendar']);
      },
      error: (error) => {
        this.isLoading = false;

        // Extraire les informations d'erreur
        const extracted = ApiErrorHandler.extractError(error);

        // Gérer les erreurs réseau en premier
        if (ApiErrorHandler.isNetworkError(error)) {
          this.notificationService.show('danger', extracted.message, 5000);
          return;
        }

        // Réinitialiser les erreurs serveur précédentes
        this.loginForm.get('email')?.setErrors(null);
        this.loginForm.get('password')?.setErrors(null);

        // Gérer les erreurs de validation Zod
        if (ApiErrorHandler.isValidationError(error)) {
          const validationDetails = ApiErrorHandler.getValidationDetails(error);
          validationDetails.forEach((detail) => {
            const fieldPath = detail.path?.[0];
            const fieldControl = this.loginForm.get(fieldPath);
            if (fieldControl) {
              const errorMessage = InputErrorMessages.getServerValidationMessage(fieldPath, detail.message);
              fieldControl.setErrors({ serverError: errorMessage });
              fieldControl.markAsTouched();
            }
          });
          return;
        }

        // Gérer les erreurs métier spécifiques aux champs
        if (extracted.code === 'AUTH_EMAIL_NOT_FOUND') {
          const emailControl = this.loginForm.get('email');
          if (emailControl) {
            emailControl.setErrors({ serverError: InputErrorMessages.getBusinessErrorMessage(extracted.code) || extracted.message });
            emailControl.markAsTouched();
          }
        } else if (extracted.code === 'AUTH_INVALID_PASSWORD') {
          const passwordControl = this.loginForm.get('password');
          if (passwordControl) {
            passwordControl.setErrors({ serverError: InputErrorMessages.getBusinessErrorMessage(extracted.code) || extracted.message });
            passwordControl.markAsTouched();
          }
        } else {
          // Erreurs générales (compte désactivé, erreurs système) → Notification uniquement
          this.notificationService.show('danger', extracted.message);
        }
      },
    });
  }

  private handleRegister(): void {
    if (this.registerForm.invalid) {
      FormUtils.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isLoading = true;
    // Réinitialiser les erreurs serveur
    this.registerForm.get('email')?.setErrors(null);
    this.registerForm.get('password')?.setErrors(null);
    this.registerForm.get('nom')?.setErrors(null);
    this.registerForm.get('prenom')?.setErrors(null);

    const { nom, prenom, email, password } = this.registerForm.value;

    this.authService.register({ nom, prenom, email, password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationService.show('success', NotificationMessages.AUTH_REGISTER_SUCCESS, 5000);
        
        // Après inscription, naviguer vers /login avec l'email pré-rempli
        this.router.navigate(['/login'], {
          queryParams: { email }
        });
      },
      error: (error) => {
        this.isLoading = false;

        // Extraire les informations d'erreur
        const extracted = ApiErrorHandler.extractError(error);

        // Gérer les erreurs réseau en premier
        if (ApiErrorHandler.isNetworkError(error)) {
          this.notificationService.show('danger', extracted.message, 5000);
          return;
        }

        // Réinitialiser les erreurs serveur précédentes
        this.registerForm.get('email')?.setErrors(null);
        this.registerForm.get('password')?.setErrors(null);
        this.registerForm.get('nom')?.setErrors(null);
        this.registerForm.get('prenom')?.setErrors(null);

        // Gérer les erreurs de validation Zod
        if (ApiErrorHandler.isValidationError(error)) {
          const validationDetails = ApiErrorHandler.getValidationDetails(error);
          validationDetails.forEach((detail) => {
            const fieldPath = detail.path?.[0];
            const fieldControl = this.registerForm.get(fieldPath);
            if (fieldControl) {
              const errorMessage = InputErrorMessages.getServerValidationMessage(fieldPath, detail.message);
              fieldControl.setErrors({ serverError: errorMessage });
              fieldControl.markAsTouched();
            }
          });
          return;
        }

        // Gérer les erreurs métier spécifiques aux champs
        if (extracted.code === 'AUTH_EMAIL_EXISTS') {
          const emailControl = this.registerForm.get('email');
          if (emailControl) {
            emailControl.setErrors({ serverError: InputErrorMessages.getBusinessErrorMessage(extracted.code) || extracted.message });
            emailControl.markAsTouched();
          }
        } else {
          // Erreurs générales → Notification uniquement
          this.notificationService.show('danger', extracted.message);
        }
      },
    });
  }


  /**
   * Vérifie si un champ a une erreur
   */
  hasError(form: FormGroup, fieldName: string, errorType: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.hasError(errorType) && (field.touched || field.dirty));
  }

  /**
   * Obtient le message et le type pour un champ du formulaire
   * Utilise la classe centralisée InputErrorMessages
   */
  getInputMessage(form: FormGroup, fieldName: string): { message: string; type: InputMessageType | '' } {
    return InputErrorMessages.getInputMessage(form, fieldName, {
      showWarningForPassword: true,
      passwordMinLength: 12
    });
  }

  /**
   * Met à jour la valeur d'un formControl
   */
  updateFormControl(form: FormGroup, fieldName: string, value: string): void {
    const control = form.get(fieldName);
    if (control) {
      control.setValue(value);
      control.markAsTouched();
      // Réinitialiser les erreurs serveur lors de la saisie
      if (control.hasError('serverError')) {
        const errors = { ...control.errors };
        delete errors['serverError'];
        control.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    }
  }

  // Getters pour les messages du formulaire de connexion
  get loginEmailMessage() {
    return this.getInputMessage(this.loginForm, 'email');
  }

  get loginPasswordMessage() {
    return this.getInputMessage(this.loginForm, 'password');
  }

  // Getters pour les messages du formulaire d'inscription
  get registerNomMessage() {
    return this.getInputMessage(this.registerForm, 'nom');
  }

  get registerPrenomMessage() {
    return this.getInputMessage(this.registerForm, 'prenom');
  }

  get registerEmailMessage() {
    return this.getInputMessage(this.registerForm, 'email');
  }

  get registerPasswordMessage() {
    return this.getInputMessage(this.registerForm, 'password');
  }

  get registerConfirmPasswordMessage() {
    return this.getInputMessage(this.registerForm, 'confirmPassword');
  }

  /**
   * Obtient la valeur du mot de passe pour l'indicateur de force
   */
  get registerPasswordValue(): string {
    return this.registerForm.get('password')?.value || '';
  }

  /**
   * Obtient le message pour le champ de confirmation de mot de passe
   */
  getConfirmPasswordMessage(): string {
    const field = this.registerForm.get('confirmPassword');
    if (field?.hasError('passwordMismatch') && (field.touched || field.dirty)) {
      return 'Les mots de passe ne correspondent pas';
    }
    return '';
  }

  /**
   * Obtient le type de message pour le champ de confirmation de mot de passe
   */
  getConfirmPasswordMessageType(): InputMessageType | '' {
    const field = this.registerForm.get('confirmPassword');
    if (field?.hasError('passwordMismatch') && (field.touched || field.dirty)) {
      return 'error';
    }
    return '';
  }
}
