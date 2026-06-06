import { ChangeDetectionStrategy, Component, HostBinding, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { UiButtonComponent } from '../button/ui-button.component';
import { UiInputComponent, InputMessageType, SelectOption } from '../input/ui-input.component';
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
  imports: [ReactiveFormsModule, RouterModule, UiButtonComponent, UiInputComponent, PasswordStrengthIndicatorComponent],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class AuthComponent implements OnInit {
  isLoginMode = true;
  isLoading = false;

  loginForm: FormGroup;
  registerForm: FormGroup;
  medecinOptions: SelectOption[] = [];

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
      medecinId: ['', [Validators.required]],
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
    
    // Si l'utilisateur est déjà authentifié, rediriger selon son rôle
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.authService.isPatient() ? '/prendre-rendez-vous' : '/calendar']);
      return;
    }

    // Charger la liste des médecins pour le select d'inscription patient
    this.loadMedecins();

    // Pré-remplir l'email si passé en query param (après inscription)
    this.route.queryParams.subscribe(params => {
      if (params['email'] && this.isLoginMode) {
        this.loginForm.patchValue({ email: params['email'] });
      }
    });
  }

  private loadMedecins(): void {
    this.authService.getMedecins().subscribe({
      next: ({ medecins }) => {
        this.medecinOptions = medecins.map((m) => ({
          value: m.id,
          label: `Dr ${m.prenom} ${m.nom}${m.specialite ? ' — ' + m.specialite : ''}`,
        }));
      },
      error: () => {
        this.medecinOptions = [];
      },
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

    const fields = ['email', 'password'];
    this.isLoading = true;
    this.clearServerErrors(this.loginForm, fields);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.notificationService.show('success', NotificationMessages.AUTH_LOGIN_SUCCESS);
        this.router.navigate([res.role === 'PATIENT' ? '/prendre-rendez-vous' : '/calendar']);
      },
      error: (error) => {
        this.isLoading = false;
        this.handleAuthError(this.loginForm, error, fields, {
          AUTH_EMAIL_NOT_FOUND: 'email',
          AUTH_INVALID_PASSWORD: 'password',
        });
      },
    });
  }

  private handleRegister(): void {
    if (this.registerForm.invalid) {
      FormUtils.markFormGroupTouched(this.registerForm);
      return;
    }

    const fields = ['email', 'password', 'nom', 'prenom', 'medecinId'];
    this.isLoading = true;
    this.clearServerErrors(this.registerForm, fields);

    const { nom, prenom, email, password, medecinId } = this.registerForm.value;

    this.authService
      .registerPatient({ nom, prenom, email, password, medecinId: Number(medecinId) })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.notificationService.show('success', NotificationMessages.AUTH_REGISTER_SUCCESS, 5000);
          this.router.navigate(['/prendre-rendez-vous']);
        },
        error: (error) => {
          this.isLoading = false;
          this.handleAuthError(this.registerForm, error, fields, {
            AUTH_EMAIL_EXISTS: 'email',
          });
        },
      });
  }

  /** Réinitialise les erreurs des champs donnés (avant un nouvel envoi). */
  private clearServerErrors(form: FormGroup, fields: string[]): void {
    fields.forEach((field) => form.get(field)?.setErrors(null));
  }

  /** Applique une erreur serveur à un champ et le marque comme touché. */
  private setFieldServerError(form: FormGroup, fieldName: string, message: string): void {
    const control = form.get(fieldName);
    if (control) {
      control.setErrors({ serverError: message });
      control.markAsTouched();
    }
  }

  /**
   * Gère une erreur d'authentification : réseau, validation Zod (par champ),
   * erreur métier rattachée à un champ, ou notification générale.
   * @param businessErrorFields code d'erreur → nom du champ à marquer en erreur.
   */
  private handleAuthError(
    form: FormGroup,
    error: unknown,
    fields: string[],
    businessErrorFields: Record<string, string>
  ): void {
    const extracted = ApiErrorHandler.extractError(error);

    if (ApiErrorHandler.isNetworkError(error)) {
      this.notificationService.show('danger', extracted.message, 5000);
      return;
    }

    this.clearServerErrors(form, fields);

    if (ApiErrorHandler.isValidationError(error)) {
      ApiErrorHandler.getValidationDetails(error).forEach((detail) => {
        const fieldPath = detail.path?.[0];
        const control = fieldPath ? form.get(fieldPath) : null;
        if (control) {
          control.setErrors({
            serverError: InputErrorMessages.getServerValidationMessage(fieldPath, detail.message),
          });
          control.markAsTouched();
        }
      });
      return;
    }

    const code = extracted.code;
    const businessField = code ? businessErrorFields[code] : undefined;
    if (code && businessField) {
      const message = InputErrorMessages.getBusinessErrorMessage(code) || extracted.message;
      this.setFieldServerError(form, businessField, message);
    } else {
      this.notificationService.show('danger', extracted.message);
    }
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

  get registerMedecinMessage() {
    return this.getInputMessage(this.registerForm, 'medecinId');
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

  /** True si la confirmation diffère du mot de passe (et le champ a été touché). */
  private get hasConfirmPasswordMismatch(): boolean {
    const field = this.registerForm.get('confirmPassword');
    return !!(field?.hasError('passwordMismatch') && (field.touched || field.dirty));
  }

  getConfirmPasswordMessage(): string {
    return this.hasConfirmPasswordMismatch ? 'Les mots de passe ne correspondent pas' : '';
  }

  getConfirmPasswordMessageType(): InputMessageType | '' {
    return this.hasConfirmPasswordMismatch ? 'error' : '';
  }
}
