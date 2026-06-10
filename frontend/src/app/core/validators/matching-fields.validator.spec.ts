import '@angular/compiler';

import { FormControl, FormGroup, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { matchingFieldsValidator } from './matching-fields.validator';

describe('matchingFieldsValidator', () => {
  it('marque la confirmation différente', () => {
    const form = new FormGroup(
      {
        password: new FormControl('Password123!'),
        confirmation: new FormControl('Different123!'),
      },
      { validators: matchingFieldsValidator('password', 'confirmation') }
    );

    expect(form.hasError('passwordMismatch')).toBe(true);
    expect(form.get('confirmation')?.hasError('passwordMismatch')).toBe(true);
  });

  it('préserve les autres erreurs du champ de confirmation', () => {
    const form = new FormGroup(
      {
        password: new FormControl('Password123!'),
        confirmation: new FormControl('', Validators.required),
      },
      { validators: matchingFieldsValidator('password', 'confirmation') }
    );

    form.get('password')?.setValue('');

    expect(form.get('confirmation')?.hasError('required')).toBe(true);
    expect(form.get('confirmation')?.hasError('passwordMismatch')).toBe(false);
  });
});
