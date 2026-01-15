import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostBinding, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../icon/app-icon.component';

export type InputType = 'text' | 'email' | 'password' | 'select';
export type InputMessageType = 'error' | 'info' | 'success' | 'warning';

export interface SelectOption {
  value: string | number;
  label: string;
}

@Component({
  selector: 'ui-input',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  templateUrl: './ui-input.component.html',
  styleUrl: './ui-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiInputComponent implements OnChanges, AfterViewInit, OnDestroy {
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
  @Input() options: SelectOption[] = []; // Options pour le select
  @Output() input = new EventEmitter<Event>(); // Émet l'événement input vers le parent
  @Output() change = new EventEmitter<Event>(); // Émet l'événement change vers le parent (pour select)

  @ViewChild('selectElement', { static: false }) selectElement?: ElementRef<HTMLSelectElement>;

  showPassword: boolean = false; // État pour afficher/masquer le mot de passe
  isDropdownOpen: boolean = false; // État pour le dropdown

  private computedMessage: string = '';
  private computedMessageType: InputMessageType | '' = '';
  private lastValue: string = '';

  constructor(private cdr: ChangeDetectorRef) {
    this.lastValue = this.value;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Recalculer le message automatique si la valeur, le type, ou les contraintes changent
    if (changes['value'] || changes['type'] || changes['required'] || changes['minLength'] || changes['touched'] || changes['dirty']) {
      this.computeAutoMessage();
      this.cdr.markForCheck();
    }
    // Forcer la mise à jour du select si la valeur ou les options changent
    if (this.type === 'select' && (changes['value'] || changes['options'])) {
      // Utiliser setTimeout pour s'assurer que le DOM est mis à jour
      setTimeout(() => {
        this.updateSelectValue();
      }, 0);
    }
  }

  ngAfterViewInit(): void {
    // Forcer la mise à jour du select après l'initialisation de la vue
    if (this.type === 'select') {
      setTimeout(() => {
        this.updateSelectValue();
      }, 0);
      // Fermer le dropdown en cliquant à l'extérieur
      document.addEventListener('click', this.handleClickOutside.bind(this));
    }
  }

  ngOnDestroy(): void {
    if (this.type === 'select') {
      document.removeEventListener('click', this.handleClickOutside.bind(this));
    }
  }

  private handleClickOutside(event: MouseEvent): void {
    if (this.isDropdownOpen) {
      const target = event.target as HTMLElement;
      if (!target.closest('.input-wrapper')) {
        this.isDropdownOpen = false;
        this.cdr.markForCheck();
      }
    }
  }

  toggleDropdown(): void {
    if (!this.disabled) {
      this.isDropdownOpen = !this.isDropdownOpen;
      this.cdr.markForCheck();
    }
  }

  selectOption(option: SelectOption): void {
    this.value = String(option.value);
    this.isDropdownOpen = false;
    this.computeAutoMessage();
    this.cdr.markForCheck();
    
    // Mettre à jour le select caché et émettre l'événement
    if (this.selectElement) {
      this.selectElement.nativeElement.value = this.value;
      const changeEvent = new Event('change', { bubbles: true });
      this.selectElement.nativeElement.dispatchEvent(changeEvent);
      this.change.emit(changeEvent);
    }
  }

  get selectedLabel(): string {
    if (!this.value) return this.placeholder || '';
    const option = this.options.find(opt => String(opt.value) === String(this.value));
    return option?.label || '';
  }

  isSelected(optionValue: string | number): boolean {
    return String(optionValue) === String(this.value);
  }

  /**
   * Met à jour la valeur du select si nécessaire
   */
  private updateSelectValue(): void {
    if (this.type === 'select' && this.selectElement && this.value) {
      // Vérifier que la valeur existe dans les options avant de la définir
      const valueExists = this.options.some(opt => String(opt.value) === String(this.value));
      if (valueExists && this.selectElement.nativeElement.value !== this.value) {
        this.selectElement.nativeElement.value = this.value;
        this.lastValue = this.value;
        this.cdr.markForCheck();
      }
    }
  }

  /**
   * Gère l'événement input pour mettre à jour la valeur et recalculer le message
   */
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    this.value = target.value;
    this.computeAutoMessage();
    this.cdr.markForCheck();
    // Émettre l'événement vers le parent
    this.input.emit(event);
  }

  /**
   * Gère l'événement change pour le select
   */
  onChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.value = target.value;
    this.computeAutoMessage();
    this.cdr.markForCheck();
    // Émettre l'événement change vers le parent
    this.change.emit(event);
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
    if (this.type === 'select') {
      classes.push('ui-input--select');
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

