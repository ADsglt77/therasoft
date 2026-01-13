import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validateur personnalisé pour les mots de passe
 * Un mot de passe est valide si:
 * - longueur >= 12
 * - contient au moins 1 majuscule [A-Z]
 * - contient au moins 1 minuscule [a-z]
 * - contient au moins 1 chiffre [0-9]
 * - contient au moins 1 caractère spécial [^A-Za-z0-9]
 * 
 * Exemples de tests:
 * - Valide: "Password123!" ✅
 * - Invalide: "password123!" ❌ (pas de majuscule)
 * - Invalide: "PASSWORD123!" ❌ (pas de minuscule)
 * - Invalide: "Password!!!!" ❌ (pas de chiffre)
 * - Invalide: "Password1234" ❌ (pas de spécial)
 * - Invalide: "Pass1!" ❌ (trop court, < 12)
 */
export class PasswordValidator {
  /**
   * Validateur complet pour les mots de passe
   */
  static strong(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // La validation required est gérée séparément
      }

      const password = control.value as string;
      const errors: ValidationErrors = {};

      // Longueur minimale
      if (password.length < 12) {
        errors['passwordMinLength'] = {
          requiredLength: 12,
          actualLength: password.length,
        };
      }

      // Majuscule
      if (!/[A-Z]/.test(password)) {
        errors['passwordUppercase'] = true;
      }

      // Minuscule
      if (!/[a-z]/.test(password)) {
        errors['passwordLowercase'] = true;
      }

      // Chiffre
      if (!/[0-9]/.test(password)) {
        errors['passwordNumber'] = true;
      }

      // Caractère spécial
      if (!/[^A-Za-z0-9]/.test(password)) {
        errors['passwordSpecial'] = true;
      }

      return Object.keys(errors).length > 0 ? errors : null;
    };
  }
}

