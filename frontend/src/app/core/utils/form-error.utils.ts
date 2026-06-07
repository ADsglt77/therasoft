import { FormGroup } from '@angular/forms';
import { ApiErrorHandler } from './api-error-handler';
import { InputErrorMessages } from './input-error-messages';

/**
 * Applique les erreurs de validation serveur (Zod) aux champs correspondants
 * d'un formulaire réactif (erreur `serverError` + champ marqué « touched »).
 *
 * @returns `true` si l'erreur était une erreur de validation (et a été appliquée),
 *          `false` sinon (l'appelant gère alors l'erreur autrement).
 */
export function applyServerValidationErrors(form: FormGroup, error: unknown): boolean {
  if (!ApiErrorHandler.isValidationError(error)) {
    return false;
  }
  ApiErrorHandler.getValidationDetails(error).forEach((detail) => {
    const fieldPath = detail.path?.[0];
    const control = fieldPath ? form.get(fieldPath) : null;
    if (control) {
      control.setErrors({ serverError: InputErrorMessages.getServerValidationMessage(fieldPath, detail.message) });
      control.markAsTouched();
    }
  });
  return true;
}
