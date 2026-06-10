import { describe, expect, it } from 'vitest';
import { passwordPolicyError } from './password-policy';

describe('passwordPolicyError', () => {
  it('accepte un mot de passe conforme', () => {
    expect(passwordPolicyError('Password123!')).toBeNull();
  });

  it('rejette chaque catégorie manquante', () => {
    expect(passwordPolicyError('Short1!')).toContain('12');
    expect(passwordPolicyError('password123!')).toContain('majuscule');
    expect(passwordPolicyError('PASSWORD123!')).toContain('minuscule');
    expect(passwordPolicyError('Password!!!!')).toContain('chiffre');
    expect(passwordPolicyError('Password1234')).toContain('spécial');
  });
});
