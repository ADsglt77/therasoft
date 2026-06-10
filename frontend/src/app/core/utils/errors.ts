import { HttpErrorResponse } from '@angular/common/http';
import { FormGroup } from '@angular/forms';

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

interface ExtractedApiError {
  code: string | null;
  message: string;
  details: unknown | null;
  requestId: string | null;
}

interface InputErrorMessage {
  message: string;
  type: 'error' | 'warning' | 'success' | '';
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }
  const error = value.error;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  );
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
}

export function extractApiError(error: unknown): ExtractedApiError {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return {
      code: null,
      message: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
      details: null,
      requestId: null,
    };
  }
  if (error instanceof HttpErrorResponse && error.status >= 500) {
    return {
      code: null,
      message: 'Le serveur rencontre un problème. Veuillez réessayer plus tard.',
      details: null,
      requestId: null,
    };
  }
  if (error instanceof HttpErrorResponse && isApiErrorResponse(error.error)) {
    return {
      code: error.error.error.code || null,
      message: error.error.error.message || 'Une erreur est survenue',
      details: error.error.error.details ?? null,
      requestId: error.error.requestId || null,
    };
  }
  if (error instanceof Error) {
    return {
      code: null,
      message: error.message || 'Une erreur est survenue',
      details: null,
      requestId: null,
    };
  }
  return {
    code: null,
    message: 'Une erreur inconnue est survenue',
    details: null,
    requestId: null,
  };
}

export function applyServerValidationErrors(form: FormGroup, error: unknown): boolean {
  const extracted = extractApiError(error);
  if (extracted.code !== 'VALIDATION_ERROR' || !Array.isArray(extracted.details)) {
    return false;
  }

  extracted.details.forEach((detail) => {
    if (
      typeof detail !== 'object' ||
      detail === null ||
      !('path' in detail) ||
      !('message' in detail) ||
      !Array.isArray(detail.path) ||
      typeof detail.path[0] !== 'string' ||
      typeof detail.message !== 'string'
    ) {
      return;
    }
    const control = form.get(detail.path[0]);
    control?.setErrors({ serverError: detail.message });
    control?.markAsTouched();
  });
  return true;
}

function passwordLengthMessage(missing: number, requiredLength: number): string {
  return `Il manque ${missing} caractère${missing > 1 ? 's' : ''} pour que votre mot de passe ait ${requiredLength} caractères`;
}

export function getInputMessage(
  form: FormGroup,
  fieldName: string,
  options?: { showWarningForPassword?: boolean; passwordMinLength?: number }
): InputErrorMessage {
  const field = form.get(fieldName);
  if (!field) {
    return { message: '', type: '' };
  }

  if (field.hasError('serverError')) {
    return { message: field.errors?.['serverError'] || 'Erreur serveur', type: 'error' };
  }

  if (!field.touched && !field.dirty) {
    const valueLength = field.value?.length ?? 0;
    const requiredLength = options?.passwordMinLength ?? 12;
    if (options?.showWarningForPassword && fieldName === 'password' && valueLength < requiredLength) {
      return valueLength > 0
        ? { message: passwordLengthMessage(requiredLength - valueLength, requiredLength), type: 'warning' }
        : { message: '', type: '' };
    }
    return { message: '', type: '' };
  }

  if (field.hasError('required')) return { message: 'Ce champ est requis', type: 'error' };
  if (field.hasError('email')) return { message: 'Email invalide', type: 'error' };

  if (fieldName === 'password' || fieldName === 'newPassword') {
    const passwordMinLength = field.errors?.['passwordMinLength'];
    if (passwordMinLength) {
      const requiredLength = passwordMinLength.requiredLength || 12;
      const currentLength = passwordMinLength.actualLength || 0;
      return {
        message: passwordLengthMessage(requiredLength - currentLength, requiredLength),
        type: 'error',
      };
    }
    if (field.hasError('passwordUppercase')) return { message: 'Au moins 1 majuscule requise.', type: 'error' };
    if (field.hasError('passwordLowercase')) return { message: 'Au moins 1 minuscule requise.', type: 'error' };
    if (field.hasError('passwordNumber')) return { message: 'Au moins 1 chiffre requis.', type: 'error' };
    if (field.hasError('passwordSpecial')) return { message: 'Au moins 1 caractère spécial requis.', type: 'error' };
  }

  const minLength = field.errors?.['minlength']?.requiredLength;
  if (minLength) {
    const missing = minLength - (field.value?.length || 0);
    return fieldName === 'password' && missing > 0
      ? { message: passwordLengthMessage(missing, minLength), type: 'warning' }
      : { message: `Minimum ${minLength} caractères requis`, type: 'error' };
  }

  const maxLength = field.errors?.['maxlength']?.requiredLength;
  if (maxLength) return { message: `Maximum ${maxLength} caractères autorisés`, type: 'error' };
  if (field.hasError('passwordMismatch')) {
    return { message: 'Les mots de passe ne correspondent pas', type: 'error' };
  }
  if (field.hasError('pattern')) return { message: 'Le format est invalide', type: 'error' };
  if (field.hasError('futureDate')) {
    return { message: 'La date de naissance ne peut pas être dans le futur', type: 'error' };
  }
  if (field.hasError('invalidDate')) return { message: 'Date de naissance invalide', type: 'error' };
  if (field.hasError('addressNotSelected')) {
    return { message: 'Sélectionnez une adresse dans la liste proposée', type: 'error' };
  }
  return { message: '', type: '' };
}

const businessErrorMessages: Record<string, string> = {
  AUTH_EMAIL_NOT_FOUND: 'Aucun compte trouvé avec cet email',
  AUTH_EMAIL_EXISTS: 'Cet email est déjà utilisé',
  AUTH_INVALID_PASSWORD: 'Mot de passe incorrect',
  AUTH_ACCOUNT_INACTIVE: "Votre compte est désactivé. Veuillez contacter l'administrateur",
  AUTH_INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
  AUTH_SAME_PASSWORD: "Le nouveau mot de passe doit être différent de l'ancien",
};

export function getBusinessErrorMessage(errorCode: string): string {
  return businessErrorMessages[errorCode] || 'Erreur lors de la validation';
}
