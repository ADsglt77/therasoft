import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

export interface PasswordRule {
  label: string;
  isValid: boolean;
}

/**
 * Composant indicateur de force de mot de passe
 * Affiche une barre de progression et une liste des règles de validation
 */
@Component({
  selector: 'app-password-strength-indicator',
  standalone: true,
  imports: [],
  templateUrl: './password-strength-indicator.component.html',
  styleUrl: './password-strength-indicator.component.scss',
})
export class PasswordStrengthIndicatorComponent implements OnChanges {
  @Input() password: string = '';

  // Ordre des règles (correspond aux 4 segments visuels) :
  // Segment 1: 12 caractères minimum
  // Segment 2: Au moins 1 majuscule [A-Z]
  // Segment 3: Au moins 1 chiffre [0-9]
  // Segment 4: Au moins 1 caractère spécial [^A-Za-z0-9]
  // Note: La règle "minuscule" est validée côté backend mais non affichée visuellement
  rules: PasswordRule[] = [
    { label: '12 caractères minimum', isValid: false },
    { label: 'Au moins 1 majuscule', isValid: false },
    { label: 'Au moins 1 chiffre', isValid: false },
    { label: 'Au moins 1 caractère spécial', isValid: false },
  ];

  /** Nombre de critères validés (pour l'attribut ARIA aria-valuenow) */
  get validCount(): number {
    return this.rules.filter((rule) => rule.isValid).length;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['password']) {
      this.evaluatePassword(this.password);
    }
  }

  /**
   * Évalue le mot de passe et met à jour les règles
   */
  private evaluatePassword(password: string): void {
    if (!password) {
      this.rules.forEach(rule => rule.isValid = false);
      return;
    }

    // Évaluer chaque règle (ordre correspond aux segments visuels)
    this.rules[0].isValid = password.length >= 12;           // Segment 1: Longueur
    this.rules[1].isValid = /[A-Z]/.test(password);          // Segment 2: Majuscule
    this.rules[2].isValid = /[0-9]/.test(password);          // Segment 3: Chiffre
    this.rules[3].isValid = /[^A-Za-z0-9]/.test(password);   // Segment 4: Spécial
    // Note: La validation minuscule [a-z] est gérée côté backend uniquement
  }
}

