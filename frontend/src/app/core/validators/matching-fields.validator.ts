import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

export function matchingFieldsValidator(
  sourceField: string,
  confirmationField: string,
  errorKey = 'passwordMismatch'
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const form = control as FormGroup;
    const source = form.get(sourceField);
    const confirmation = form.get(confirmationField);
    if (!source || !confirmation) {
      return null;
    }

    const mismatch = source.value !== confirmation.value;
    const errors = { ...(confirmation.errors ?? {}) };

    if (mismatch) {
      confirmation.setErrors({ ...errors, [errorKey]: true });
      return { [errorKey]: true };
    }

    if (errorKey in errors) {
      delete errors[errorKey];
      confirmation.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }
    return null;
  };
}
