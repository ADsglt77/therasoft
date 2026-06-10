import { ChangeDetectionStrategy, Component, HostBinding, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { UiButtonComponent } from '../button/ui-button.component';
import { UiInputComponent, InputMessageType, SelectOption } from '../input/ui-input.component';
import { AddressAutocompleteComponent } from '../address-autocomplete/address-autocomplete.component';
import { PasswordStrengthIndicatorComponent } from '../password-strength-indicator/password-strength-indicator.component';
import { UiStepperComponent, StepperStep } from '../stepper/ui-stepper.component';
import { AddressSuggestion, AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  applyServerValidationErrors,
  extractApiError,
  getBusinessErrorMessage,
  getInputMessage,
  isNetworkError,
} from '../../core/utils/errors';
import {
  clearServerErrors,
  markFormTouched,
  setServerError,
  updateControl,
} from '../../core/utils/form-utils';
import { PasswordValidator } from '../../core/validators/password.validator';
import { matchingFieldsValidator } from '../../core/validators/matching-fields.validator';
import { take } from 'rxjs';
import { parisDateKey, parseDateKey } from '../../core/utils/date.utils';

function dateNotInFuture(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;

  if (!parseDateKey(value)) {
    return { invalidDate: true };
  }

  return value > parisDateKey() ? { futureDate: true } : null;
}

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, UiButtonComponent, UiInputComponent, AddressAutocompleteComponent, PasswordStrengthIndicatorComponent, UiStepperComponent],
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
  readonly sexeOptions: SelectOption[] = [
    { value: 'M', label: 'Masculin' },
    { value: 'F', label: 'Féminin' },
    { value: 'X', label: 'Autre' },
  ];
  readonly maxDateNaissance = parisDateKey();

  // Wizard d'inscription : étape courante + champs validés par étape.
  registerStep = 0;
  registerMaxReachable = 0;
  private readonly registerStepFields: readonly (readonly string[])[] = [
    ['nom', 'prenom', 'dateNaissance', 'sexe', 'adresse'],
    ['medecinId'],
    ['email', 'password', 'confirmPassword'],
  ];

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
      dateNaissance: ['', [Validators.required, dateNotInFuture]],
      sexe: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email, Validators.minLength(3), Validators.maxLength(100)]],
      password: ['', [Validators.required, PasswordValidator.strong()]],
      confirmPassword: ['', [Validators.required]],
      medecinId: ['', [Validators.required]],
      adresse: ['', [Validators.required, Validators.minLength(3)]],
    }, {
      validators: matchingFieldsValidator('password', 'confirmPassword')
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
    
    this.authService
      .restoreSession()
      .pipe(take(1))
      .subscribe((user) => {
        if (user) {
          void this.router.navigate([
            user.role === 'PATIENT' ? '/prendre-rendez-vous' : '/calendar',
          ]);
        }
      });

    // Charger la liste des médecins pour le select d'inscription patient
    this.loadMedecins();

    // Pré-remplir l'email si passé en query param (après inscription)
    this.route.queryParams.pipe(take(1)).subscribe(params => {
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
          label: `Dr ${m.prenom} ${m.nom}`,
        }));
      },
      error: () => {
        this.medecinOptions = [];
      },
    });
  }

  // --- Wizard d'inscription (étapes) ---

  get registerSteps(): StepperStep[] {
    return [
      { label: 'Vos informations', value: null, done: this.registerStep > 0 },
      { label: 'Votre médecin', value: null, done: this.registerStep > 1 },
      { label: 'Connexion', value: null, done: false },
    ];
  }

  get isLastRegisterStep(): boolean {
    return this.registerStep === this.registerStepFields.length - 1;
  }

  /** Valide l'étape courante puis avance (ou marque les champs en erreur). */
  nextRegisterStep(): void {
    const fields = this.registerStepFields[this.registerStep];
    const stepValid = fields.every((field) => this.registerForm.get(field)?.valid);
    if (!stepValid) {
      fields.forEach((field) => this.registerForm.get(field)?.markAsTouched());
      return;
    }
    if (!this.isLastRegisterStep) {
      this.registerStep++;
      this.registerMaxReachable = Math.max(this.registerMaxReachable, this.registerStep);
    }
  }

  prevRegisterStep(): void {
    if (this.registerStep > 0) {
      this.registerStep--;
    }
  }

  goToRegisterStep(index: number): void {
    if (index <= this.registerMaxReachable) {
      this.registerStep = index;
    }
  }

  /** Entrée clavier dans le formulaire d'inscription : avance ou soumet. */
  onRegisterEnter(): void {
    if (this.isLastRegisterStep) {
      this.onSubmit();
    } else {
      this.nextRegisterStep();
    }
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
      markFormTouched(this.loginForm);
      return;
    }

    const fields = ['email', 'password'];
    this.isLoading = true;
    clearServerErrors(this.loginForm, fields);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.notificationService.show('success', 'Connexion réussie !');
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
      markFormTouched(this.registerForm);
      return;
    }

    const fields = [
      'email',
      'password',
      'nom',
      'prenom',
      'dateNaissance',
      'sexe',
      'medecinId',
      'adresse',
    ];
    this.isLoading = true;
    clearServerErrors(this.registerForm, fields);

    const {
      nom,
      prenom,
      dateNaissance,
      sexe,
      email,
      password,
      medecinId,
      adresse,
    } = this.registerForm.value;

    this.authService
      .registerPatient({
        nom,
        prenom,
        dateNaissance,
        sexe,
        email,
        password,
        medecinId: Number(medecinId),
        adresse,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.notificationService.show('success', 'Compte créé avec succès !', 5000);
          this.router.navigate(['/prendre-rendez-vous']);
        },
        error: (error) => {
          this.isLoading = false;
          this.handleAuthError(this.registerForm, error, fields, {
            AUTH_EMAIL_EXISTS: 'email',
            AUTH_ADDRESS_NOT_FOUND: 'adresse',
          });
        },
      });
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
    const extracted = extractApiError(error);

    if (isNetworkError(error)) {
      this.notificationService.show('danger', extracted.message, 5000);
      return;
    }

    clearServerErrors(form, fields);

    if (applyServerValidationErrors(form, error)) {
      return;
    }

    const code = extracted.code;
    const businessField = code ? businessErrorFields[code] : undefined;
    if (code && businessField) {
      setServerError(form, businessField, getBusinessErrorMessage(code) || extracted.message);
    } else {
      this.notificationService.show('danger', extracted.message);
    }
  }


  /**
   * Obtient le message et le type pour un champ du formulaire
   * Utilise la classe centralisée InputErrorMessages
   */
  getInputMessage(form: FormGroup, fieldName: string): { message: string; type: InputMessageType | '' } {
    return getInputMessage(form, fieldName, {
      showWarningForPassword: true,
      passwordMinLength: 12
    });
  }

  /**
   * Met à jour la valeur d'un formControl
   */
  updateFormControl(form: FormGroup, fieldName: string, value: string): void {
    updateControl(form, fieldName, value);
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

  updateRegisterAddress(value: string): void {
    this.updateFormControl(this.registerForm, 'adresse', value);
    const control = this.registerForm.get('adresse');
    if (value.trim().length >= 3) {
      control?.setErrors({ addressNotSelected: true });
    }
  }

  selectRegisterAddress(suggestion: AddressSuggestion): void {
    this.registerForm.patchValue({
      adresse: suggestion.label,
    });
    const control = this.registerForm.get('adresse');
    control?.setErrors(null);
    control?.markAsTouched();
  }

  get registerDateNaissanceMessage() {
    return this.getInputMessage(this.registerForm, 'dateNaissance');
  }

  get registerSexeMessage() {
    return this.getInputMessage(this.registerForm, 'sexe');
  }

  get registerEmailMessage() {
    return this.getInputMessage(this.registerForm, 'email');
  }

  get registerMedecinMessage() {
    return this.getInputMessage(this.registerForm, 'medecinId');
  }

  get registerAdresseMessage() {
    return this.getInputMessage(this.registerForm, 'adresse');
  }

  get registerPasswordMessage() {
    return this.getInputMessage(this.registerForm, 'password');
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
