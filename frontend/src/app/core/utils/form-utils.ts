import { AbstractControl, FormGroup } from '@angular/forms';

export function markFormTouched(form: FormGroup): void {
  Object.values(form.controls).forEach((control) => control.markAsTouched());
}

function clearControlError(control: AbstractControl | null, errorKey: string): void {
  if (!control?.hasError(errorKey)) {
    return;
  }
  const errors = { ...(control.errors ?? {}) };
  delete errors[errorKey];
  control.setErrors(Object.keys(errors).length > 0 ? errors : null);
}

export function clearServerErrors(form: FormGroup, fields = Object.keys(form.controls)): void {
  fields.forEach((field) => clearControlError(form.get(field), 'serverError'));
}

export function updateControl(form: FormGroup, fieldName: string, value: unknown): void {
  const control = form.get(fieldName);
  if (!control) {
    return;
  }
  control.setValue(value);
  control.markAsTouched();
  clearControlError(control, 'serverError');
}

export function setServerError(form: FormGroup, fieldName: string, message: string): void {
  const control = form.get(fieldName);
  if (!control) {
    return;
  }
  control.setErrors({ ...(control.errors ?? {}), serverError: message });
  control.markAsTouched();
}

