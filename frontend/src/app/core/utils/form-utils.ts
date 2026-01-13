import { FormGroup } from '@angular/forms';

/**
 * Utilitaires pour les formulaires Angular
 */
export class FormUtils {
  /**
   * Marque tous les champs d'un formulaire comme touchés
   * Utile pour afficher les erreurs de validation après une soumission invalide
   */
  static markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}

