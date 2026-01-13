import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, HostBinding, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../icon/app-icon.component';

export type InputType = 'text' | 'email' | 'password';
export type InputMessageType = 'error' | 'info' | 'success' | 'warning';

@Component({
  selector: 'ui-input',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  templateUrl: './ui-input.component.html',
  styleUrl: './ui-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiInputComponent implements OnChanges {
  @Input() type: InputType = 'text';
  @Input() placeholder: string = '';
  @Input() value: string = '';
  @Input() name: string = '';
  @Input() id: string = '';
  @Input() label: string = '';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() message: string = ''; // Message personnalisé (optionnel, prend priorité sur la validation auto)
  @Input() messageType: InputMessageType | '' = ''; // Type de message personnalisé (optionnel)
  @Input() minLength: number = 0; // Longueur minimale pour la validation auto
  @Input() touched: boolean = false; // État "touched" du champ (pour la validation)
  @Input() dirty: boolean = false; // État "dirty" du champ (pour la validation)
  @Output() input = new EventEmitter<Event>(); // Émet l'événement input vers le parent

  showPassword: boolean = false; // État pour afficher/masquer le mot de passe

  private computedMessage: string = '';
  private computedMessageType: InputMessageType | '' = '';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Recalculer le message automatique si la valeur, le type, ou les contraintes changent
    if (changes['value'] || changes['type'] || changes['required'] || changes['minLength'] || changes['touched'] || changes['dirty']) {
      this.computeAutoMessage();
      this.cdr.markForCheck();
    }
  }

  /**
   * Gère l'événement input pour mettre à jour la valeur et recalculer le message
   */
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.computeAutoMessage();
    this.cdr.markForCheck();
    // Émettre l'événement vers le parent
    this.input.emit(event);
  }

  /**
   * Calcule automatiquement le message de validation en fonction du type d'input
   */
  private computeAutoMessage(): void {
    // Si un message personnalisé est fourni, l'utiliser
    if (this.message && this.messageType) {
      this.computedMessage = this.message;
      this.computedMessageType = this.messageType;
      return;
    }

    // Validation automatique pour le mot de passe
    if (this.type === 'password') {
      const length = this.value?.length || 0;
      
      // Warning si le mot de passe est en cours de saisie mais trop court
      if (length > 0 && length < 10) {
        const missing = 10 - length;
        this.computedMessage = `Il manque ${missing} caractère${missing > 1 ? 's' : ''} pour que votre mot de passe ait 10 caractères`;
        this.computedMessageType = 'warning';
        return;
      }
      
      // Erreur si le champ est requis et vide (seulement si touched)
      if (this.required && !this.value && (this.touched || this.dirty)) {
        this.computedMessage = 'Ce champ est requis';
        this.computedMessageType = 'error';
        return;
      }
    }

    // Validation pour les autres types
    if (this.type === 'text' || this.type === 'email') {
      const length = this.value?.length || 0;
      
      // Erreur si le champ est requis et vide (seulement si touched)
      if (this.required && !this.value && (this.touched || this.dirty)) {
        this.computedMessage = 'Ce champ est requis';
        this.computedMessageType = 'error';
        return;
      }
      
      // Erreur si minLength n'est pas respecté (seulement si touched)
      if (this.minLength > 0 && length > 0 && length < this.minLength && (this.touched || this.dirty)) {
        const missing = this.minLength - length;
        this.computedMessage = `Minimum ${this.minLength} caractères requis`;
        this.computedMessageType = 'error';
        return;
      }
    }

    // Pas de message par défaut
    this.computedMessage = '';
    this.computedMessageType = '';
  }

  @HostBinding('class')
  get hostClasses(): string {
    const classes = [`ui-input`, `ui-input--${this.type}`];
    const messageType = this.getDisplayMessageType();
    if (messageType) {
      classes.push(`ui-input--${messageType}`);
    }
    return classes.join(' ');
  }

  get hasMessage(): boolean {
    return !!this.getDisplayMessage();
  }

  getDisplayMessage(): string {
    // Priorité au message personnalisé, sinon utiliser le message calculé
    return this.message || this.computedMessage;
  }

  getDisplayMessageType(): InputMessageType | '' {
    // Priorité au type personnalisé, sinon utiliser le type calculé
    return this.messageType || this.computedMessageType;
  }

  get displayPlaceholder(): string {
    if (this.placeholder) {
      return this.placeholder;
    }
    switch (this.type) {
      case 'email':
        return 'Email';
      case 'password':
        return 'Mot de passe';
      default:
        return '';
    }
  }

  get displayName(): string {
    if (this.name) {
      return this.name;
    }
    switch (this.type) {
      case 'email':
        return 'email';
      case 'password':
        return 'password';
      default:
        return 'text';
    }
  }

  get displayId(): string {
    return this.id || this.displayName;
  }

  /**
   * Toggle l'affichage du mot de passe
   */
  togglePasswordVisibility(): void {
    if (this.type === 'password') {
      this.showPassword = !this.showPassword;
      this.cdr.markForCheck();
    }
  }

  /**
   * Retourne le type d'input à afficher (password ou text selon l'état)
   */
  get displayType(): string {
    if (this.type === 'password') {
      return this.showPassword ? 'text' : 'password';
    }
    return this.type;
  }

  /**
   * Retourne l'icône à afficher pour le toggle password
   */
  get passwordToggleIcon(): string {
    return this.showPassword ? 'eye-off' : 'eye';
  }

  /**
   * Vérifie si le toggle password doit être affiché
   */
  get showPasswordToggle(): boolean {
    return this.type === 'password';
  }
}

