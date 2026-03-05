import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, MeResponse } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { InputMessageType, UiInputComponent } from '../../../components/input/ui-input.component';
import { PasswordStrengthIndicatorComponent } from '../../../components/password-strength-indicator/password-strength-indicator.component';
import { InputErrorMessages } from '../../../core/utils/input-error-messages';
import { ApiErrorHandler } from '../../../core/utils/api-error-handler';
import { NotificationMessages } from '../../../core/constants/notification-messages';
import { FormUtils } from '../../../core/utils/form-utils';
import { PasswordValidator } from '../../../core/validators/password.validator';

@Component({
  selector: 'app-dashboard-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, UiInputComponent, PasswordStrengthIndicatorComponent],
  templateUrl: './dashboard-settings-page.component.html',
  styleUrl: './dashboard-settings-page.component.scss',
})
export class DashboardSettingsPageComponent implements OnInit {
  currentUser: MeResponse | null = null;
  isLoading = false;
  isProfileLoading = false;
  isPasswordLoading = false;
  isAvatarLoading = false;
  selectedAvatarFile: File | null = null;

  profileForm: FormGroup;
  passwordForm: FormGroup;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.profileForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(1)]],
      prenom: ['', [Validators.required, Validators.minLength(1)]],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, PasswordValidator.strong()]],
      confirmPassword: ['', [Validators.required]],
    }, {
      validators: this.passwordMatchValidator,
    });
  }

  ngOnInit(): void {
    this.loadUserInfo();
  }

  loadUserInfo(): void {
    this.isLoading = true;
    this.authService.getMe().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.profileForm.patchValue({
          nom: user.nom,
          prenom: user.prenom,
        });
        // Créer un File factice à partir de l'avatar URL pour l'affichage
        if (user.avatarUrl && !this.selectedAvatarFile) {
          this.createFileFromAvatarUrl(user.avatarUrl);
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        const extracted = ApiErrorHandler.extractError(error);
        this.notificationService.show('danger', extracted.message || NotificationMessages.PROFILE_LOAD_ERROR);
        this.cdr.markForCheck();
      },
    });
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

  onUpdateProfile(): void {
    if (this.profileForm.invalid) {
      FormUtils.markFormGroupTouched(this.profileForm);
      return;
    }

    this.isProfileLoading = true;
    // Réinitialiser les erreurs serveur
    this.profileForm.get('nom')?.setErrors(null);
    this.profileForm.get('prenom')?.setErrors(null);

    const { nom, prenom } = this.profileForm.value;

    this.authService.updateProfile({ nom, prenom }).subscribe({
      next: (updatedUser) => {
        this.currentUser = updatedUser;
        this.isProfileLoading = false;
        this.notificationService.show('success', NotificationMessages.PROFILE_UPDATE_SUCCESS);
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isProfileLoading = false;
        this.handleFormError(this.profileForm, error, NotificationMessages.PROFILE_UPDATE_ERROR);
      },
    });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      FormUtils.markFormGroupTouched(this.passwordForm);
      return;
    }

    this.isPasswordLoading = true;
    // Réinitialiser les erreurs serveur
    this.passwordForm.get('currentPassword')?.setErrors(null);
    this.passwordForm.get('newPassword')?.setErrors(null);
    this.passwordForm.get('confirmPassword')?.setErrors(null);

    const { currentPassword, newPassword } = this.passwordForm.value;

    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.isPasswordLoading = false;
        this.notificationService.show('success', NotificationMessages.PASSWORD_CHANGE_SUCCESS);
        this.passwordForm.reset();
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isPasswordLoading = false;

        const extracted = ApiErrorHandler.extractError(error);

        // Gérer les erreurs métier spécifiques aux champs
        const fieldErrorMappings: Record<string, string> = {
          AUTH_INVALID_PASSWORD: 'currentPassword',
          AUTH_SAME_PASSWORD: 'newPassword',
        };

        const targetField = extracted.code ? fieldErrorMappings[extracted.code] : undefined;
        if (targetField) {
          const control = this.passwordForm.get(targetField);
          if (control) {
            const message = extracted.code
              ? InputErrorMessages.getBusinessErrorMessage(extracted.code) || extracted.message
              : extracted.message;
            control.setErrors({ serverError: message });
            control.markAsTouched();
          }
          this.cdr.markForCheck();
          return;
        }

        this.handleFormError(this.passwordForm, error, NotificationMessages.PASSWORD_CHANGE_ERROR);
      },
    });
  }

  /**
   * Gestion commune des erreurs de formulaire (réseau, validation Zod, erreurs générales)
   */
  private handleFormError(form: FormGroup, error: any, fallbackMessage: string): void {
    const extracted = ApiErrorHandler.extractError(error);

    // Gérer les erreurs réseau en premier
    if (ApiErrorHandler.isNetworkError(error)) {
      this.notificationService.show('danger', extracted.message, 5000);
      this.cdr.markForCheck();
      return;
    }

    // Réinitialiser les erreurs serveur précédentes
    Object.keys(form.controls).forEach((key) => {
      const control = form.get(key);
      if (control?.hasError('serverError')) {
        const errors = { ...control.errors };
        delete errors['serverError'];
        control.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    });

    // Gérer les erreurs de validation Zod
    if (ApiErrorHandler.isValidationError(error)) {
      const validationDetails = ApiErrorHandler.getValidationDetails(error);
      validationDetails.forEach((detail) => {
        const fieldPath = detail.path?.[0];
        const fieldControl = form.get(fieldPath);
        if (fieldControl) {
          const errorMessage = InputErrorMessages.getServerValidationMessage(fieldPath, detail.message);
          fieldControl.setErrors({ serverError: errorMessage });
          fieldControl.markAsTouched();
        }
      });
      this.cdr.markForCheck();
      return;
    }

    // Erreurs générales → Notification uniquement
    this.notificationService.show('danger', extracted.message || fallbackMessage);
    this.cdr.markForCheck();
  }

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
      showWarningForPassword: fieldName === 'newPassword',
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

  // Getters pour les messages des champs du formulaire de profil
  get nomMessage() {
    return this.getInputMessage(this.profileForm, 'nom');
  }

  get prenomMessage() {
    return this.getInputMessage(this.profileForm, 'prenom');
  }

  // Getters pour les messages des champs du formulaire de mot de passe
  get currentPasswordMessage() {
    return this.getInputMessage(this.passwordForm, 'currentPassword');
  }

  get newPasswordMessage() {
    return this.getInputMessage(this.passwordForm, 'newPassword');
  }

  get confirmPasswordMessage() {
    return this.getInputMessage(this.passwordForm, 'confirmPassword');
  }

  /**
   * Obtient le message pour le champ de confirmation de mot de passe
   */
  getConfirmPasswordMessage(): string {
    const result = this.getInputMessage(this.passwordForm, 'confirmPassword');
    return result.message;
  }

  /**
   * Obtient le type de message pour le champ de confirmation de mot de passe
   */
  getConfirmPasswordMessageType(): InputMessageType | '' {
    const result = this.getInputMessage(this.passwordForm, 'confirmPassword');
    return result.type;
  }

  /**
   * Obtient la valeur du nouveau mot de passe pour l'indicateur de force
   */
  get newPasswordValue(): string {
    return this.passwordForm.get('newPassword')?.value || '';
  }

  /**
   * Gère la sélection d'un fichier avatar
   */
  onAvatarSelected(files: File[]): void {
    if (files.length === 0) return;

    const file = files[0];
    this.selectedAvatarFile = file;
    this.isAvatarLoading = true;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const avatarUrl = e.target?.result as string;
      this.uploadAvatar(avatarUrl, file.name);
    };

    reader.onerror = () => {
      this.isAvatarLoading = false;
      this.notificationService.show('danger', 'Erreur lors de la lecture du fichier');
      this.cdr.markForCheck();
    };

    reader.readAsDataURL(file);
  }

  /**
   * Upload l'avatar vers le serveur
   */
  private uploadAvatar(avatarUrl: string, fileName: string): void {
    this.authService.updateAvatar({ avatarUrl, avatarFileName: fileName }).subscribe({
      next: (updatedUser) => {
        this.currentUser = updatedUser;
        this.isAvatarLoading = false;
        this.notificationService.show('success', 'Photo de profil mise à jour avec succès');
        this.cdr.markForCheck();
      },
      error: (error) => this.handleAvatarError(error, 'Erreur lors de la mise à jour de la photo de profil'),
    });
  }

  /**
   * Gère les erreurs de fichier
   */
  onAvatarError(error: { file: File; error: string }): void {
    this.notificationService.show('danger', error.error);
  }

  /**
   * Gère la suppression d'un fichier avatar
   */
  onAvatarRemoved(remainingFiles: File[]): void {
    if (remainingFiles.length === 0) {
      this.selectedAvatarFile = null;
      this.cdr.detectChanges();
      this.deleteAvatar();
    } else {
      this.selectedAvatarFile = remainingFiles[0];
      this.cdr.markForCheck();
    }
  }

  /**
   * Supprime l'avatar du serveur
   */
  private deleteAvatar(): void {
    this.isAvatarLoading = true;
    this.authService.updateAvatar({ avatarUrl: null }).subscribe({
      next: (updatedUser) => {
        this.currentUser = updatedUser;
        this.isAvatarLoading = false;
        this.notificationService.show('success', 'Photo de profil supprimée avec succès');
        this.cdr.markForCheck();
      },
      error: (error) => this.handleAvatarError(error, 'Erreur lors de la suppression de la photo de profil'),
    });
  }

  /**
   * Gère les erreurs liées à l'avatar
   */
  private handleAvatarError(error: any, defaultMessage: string): void {
    this.isAvatarLoading = false;
    const extracted = ApiErrorHandler.extractError(error);
    this.notificationService.show('danger', extracted.message || defaultMessage);
    this.cdr.markForCheck();
  }

  /**
   * Retourne les fichiers initiaux pour l'input file
   * Crée toujours un nouveau tableau pour forcer la détection de changement
   */
  getInitialFiles(): File[] {
    return this.selectedAvatarFile ? [this.selectedAvatarFile] : [];
  }

  /**
   * Crée un File factice à partir d'une URL d'avatar pour l'affichage
   */
  private createFileFromAvatarUrl(avatarUrl: string): void {
    const fileName = this.getAvatarFileName(avatarUrl);
    
    if (avatarUrl.startsWith('data:')) {
      const blob = this.createBlobFromDataUrl(avatarUrl);
      this.selectedAvatarFile = new File([blob], fileName, { type: blob.type });
    } else {
      // Pour les URLs HTTP, créer un File placeholder
      this.selectedAvatarFile = new File([new Blob([''], { type: 'image/png' })], fileName, { type: 'image/png' });
    }
  }

  /**
   * Récupère le nom de fichier de l'avatar (depuis la base ou l'URL)
   */
  private getAvatarFileName(avatarUrl: string): string {
    if (this.currentUser?.avatarFileName) {
      return this.currentUser.avatarFileName;
    }
    return avatarUrl.includes('/') 
      ? avatarUrl.split('/').pop()?.split('?')[0] || 'avatar.png'
      : 'avatar.png';
  }

  /**
   * Crée un Blob à partir d'une data URL
   */
  private createBlobFromDataUrl(dataUrl: string): Blob {
    try {
      const [header, data] = dataUrl.split(',');
      const mimeString = header.split(':')[1].split(';')[0];
      const byteString = atob(data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mimeString });
    } catch {
      return new Blob([''], { type: 'image/png' });
    }
  }
}

