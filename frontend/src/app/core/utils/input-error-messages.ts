import { AbstractControl, FormGroup } from '@angular/forms';

/**
 * Type pour les types d'erreurs de validation
 */
export type InputErrorType = 
  | 'required'
  | 'email'
  | 'minlength'
  | 'maxlength'
  | 'passwordMismatch'
  | 'serverError'
  | 'pattern'
  | 'futureDate'
  | 'invalidDate'
  | 'addressNotSelected'
  | 'custom';

/**
 * Type pour le résultat d'un message d'erreur
 */
export interface InputErrorMessage {
  message: string;
  type: 'error' | 'warning' | 'success' | '';
}

/**
 * Messages d'erreur centralisés pour les inputs
 */
export class InputErrorMessages {
  /**
   * Obtient le message d'erreur pour un type d'erreur donné
   */
  static getErrorMessage(
    errorType: InputErrorType,
    control: AbstractControl | null,
    fieldName?: string,
    params?: { [key: string]: any }
  ): string {
    if (!control || !control.errors) {
      return '';
    }

    switch (errorType) {
      case 'required':
        return this.getRequiredMessage();
      
      case 'email':
        return this.getEmailMessage();
      
      case 'minlength': {
        const minLength = control.errors['minlength']?.requiredLength || params?.['minLength'];
        const currentLength = control.value?.length || 0;
        if (minLength) {
          // Message spécial pour les mots de passe
          if (fieldName === 'password' && currentLength > 0 && currentLength < minLength) {
            const missing = minLength - currentLength;
            return this.getPasswordMinLengthWarning(missing, minLength);
          }
          return this.getMinLengthMessage(minLength);
        }
        return '';
      }

      case 'maxlength': {
        const maxLength = control.errors['maxlength']?.requiredLength || params?.['maxLength'];
        if (maxLength) {
          return this.getMaxLengthMessage(maxLength);
        }
        return '';
      }
      
      case 'passwordMismatch':
        return this.getPasswordMismatchMessage();
      
      case 'serverError':
        return control.errors['serverError'] || this.getServerErrorMessage();
      
      case 'pattern':
        return params?.['patternMessage'] || this.getPatternMessage();

      case 'futureDate':
        return 'La date de naissance ne peut pas être dans le futur';

      case 'invalidDate':
        return 'Date de naissance invalide';

      case 'addressNotSelected':
        return 'Sélectionnez une adresse dans la liste proposée';

      case 'custom':
        return params?.['customMessage'] || '';
      
      default:
        return '';
    }
  }

  /**
   * Obtient le message et le type d'erreur complet pour un champ de formulaire
   */
  static getInputMessage(
    form: FormGroup,
    fieldName: string,
    options?: {
      showWarningForPassword?: boolean;
      passwordMinLength?: number;
    }
  ): InputErrorMessage {
    const field = form.get(fieldName);
    if (!field) {
      return { message: '', type: '' };
    }

    // Priorité 1: Erreurs serveur
    if (field.hasError('serverError')) {
      return {
        message: field.errors?.['serverError'] || this.getServerErrorMessage(),
        type: 'error'
      };
    }

    // Priorité 2: Si le champ n'a pas été touché
    if (!field.touched && !field.dirty) {
      // Warning pour mot de passe en cours de saisie
      if (
        options?.showWarningForPassword &&
        fieldName === 'password' &&
        field.value &&
        field.value.length > 0
      ) {
        const minLength = options.passwordMinLength || 12;
        if (field.value.length < minLength) {
          const missing = minLength - field.value.length;
          return {
            message: this.getPasswordMinLengthWarning(missing, minLength),
            type: 'warning'
          };
        }
      }
      return { message: '', type: '' };
    }

    // Priorité 3: Erreurs de validation
    if (field.hasError('required')) {
      return { message: this.getRequiredMessage(), type: 'error' };
    }

    if (field.hasError('email')) {
      return { message: this.getEmailMessage(), type: 'error' };
    }

    // Erreurs de validation de mot de passe (priorité avant minlength)
    if (fieldName === 'password' || fieldName === 'newPassword') {
      if (field.hasError('passwordMinLength') && field.errors) {
        const requiredLength = field.errors['passwordMinLength']?.requiredLength || 12;
        const currentLength = field.errors['passwordMinLength']?.actualLength || 0;
        const missing = requiredLength - currentLength;
        return {
          message: this.getPasswordMinLengthWarning(missing, requiredLength),
          type: 'error'
        };
      }
      if (field.hasError('passwordUppercase')) {
        return { message: 'Au moins 1 majuscule requise.', type: 'error' };
      }
      if (field.hasError('passwordLowercase')) {
        return { message: 'Au moins 1 minuscule requise.', type: 'error' };
      }
      if (field.hasError('passwordNumber')) {
        return { message: 'Au moins 1 chiffre requis.', type: 'error' };
      }
      if (field.hasError('passwordSpecial')) {
        return { message: 'Au moins 1 caractère spécial requis.', type: 'error' };
      }
    }

    if (field.hasError('minlength') && field.errors) {
      const requiredLength = field.errors['minlength']?.requiredLength;
      const currentLength = field.value?.length || 0;
      const missing = requiredLength - currentLength;
      
      // Message spécial pour les mots de passe
      if (missing > 0 && fieldName === 'password') {
        return {
          message: this.getPasswordMinLengthWarning(missing, requiredLength),
          type: 'warning'
        };
      }
      
      return {
        message: this.getMinLengthMessage(requiredLength),
        type: 'error'
      };
    }

    if (field.hasError('maxlength') && field.errors) {
      const maxLength = field.errors['maxlength']?.requiredLength;
      return {
        message: this.getMaxLengthMessage(maxLength),
        type: 'error'
      };
    }

    if (field.hasError('passwordMismatch')) {
      return {
        message: this.getPasswordMismatchMessage(),
        type: 'error'
      };
    }

    if (field.hasError('pattern')) {
      return {
        message: this.getPatternMessage(),
        type: 'error'
      };
    }

    if (field.hasError('futureDate')) {
      return {
        message: 'La date de naissance ne peut pas être dans le futur',
        type: 'error'
      };
    }

    if (field.hasError('invalidDate')) {
      return {
        message: 'Date de naissance invalide',
        type: 'error'
      };
    }

    if (field.hasError('addressNotSelected')) {
      return {
        message: 'Sélectionnez une adresse dans la liste proposée',
        type: 'error'
      };
    }

    return { message: '', type: '' };
  }

  // ============================================
  // Messages d'erreur spécifiques
  // ============================================

  private static getRequiredMessage(): string {
    return 'Ce champ est requis';
  }

  private static getEmailMessage(): string {
    return 'Email invalide';
  }

  private static getMinLengthMessage(minLength: number): string {
    return `Minimum ${minLength} caractères requis`;
  }

  private static getMaxLengthMessage(maxLength: number): string {
    return `Maximum ${maxLength} caractères autorisés`;
  }

  private static getPasswordMinLengthWarning(missing: number, requiredLength: number): string {
    return `Il manque ${missing} caractère${missing > 1 ? 's' : ''} pour que votre mot de passe ait ${requiredLength} caractères`;
  }

  private static getPasswordMismatchMessage(): string {
    return 'Les mots de passe ne correspondent pas';
  }

  private static getServerErrorMessage(): string {
    return 'Erreur serveur';
  }

  private static getPatternMessage(): string {
    return 'Le format est invalide';
  }

  // ============================================
  // Messages d'erreur serveur (validation Zod)
  // ============================================

  /**
   * Messages d'erreur par défaut pour les erreurs de validation serveur
   */
  static getServerValidationMessage(fieldPath: string, detailMessage?: string): string {
    if (detailMessage) {
      return detailMessage;
    }

    // Messages par défaut selon le champ
    const defaultMessages: { [key: string]: string } = {
      email: 'Email invalide',
      password: 'Mot de passe invalide',
      nom: 'Nom invalide',
      prenom: 'Prénom invalide',
      dateNaissance: 'Date de naissance invalide',
      sexe: 'Sexe invalide',
      confirmPassword: 'Les mots de passe ne correspondent pas',
    };

    return defaultMessages[fieldPath] || 'Champ invalide';
  }

  /**
   * Messages d'erreur métier pour les erreurs serveur
   */
  static getBusinessErrorMessage(errorCode: string): string {
    const messages: { [key: string]: string } = {
      AUTH_EMAIL_NOT_FOUND: 'Aucun compte trouvé avec cet email',
      AUTH_EMAIL_EXISTS: 'Cet email est déjà utilisé',
      AUTH_INVALID_PASSWORD: 'Mot de passe incorrect',
      AUTH_ACCOUNT_INACTIVE: 'Votre compte est désactivé. Veuillez contacter l\'administrateur',
      AUTH_INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
      AUTH_SAME_PASSWORD: 'Le nouveau mot de passe doit être différent de l\'ancien',
    };

    return messages[errorCode] || 'Erreur lors de la validation';
  }
}

