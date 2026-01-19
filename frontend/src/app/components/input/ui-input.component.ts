import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostBinding, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../icon/app-icon.component';

export type InputType = 'text' | 'email' | 'password' | 'select' | 'file';
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
  @Input() accept: string = '*/*'; // Types de fichiers acceptés (pour file)
  @Input() multiple: boolean = false; // Permettre plusieurs fichiers (pour file)
  @Input() maxSize: number = 0; // Taille maximale en bytes (0 = illimité, pour file)
  @Input() initialFiles: File[] = []; // Fichiers initiaux à afficher (pour file)
  @Output() input = new EventEmitter<Event>(); // Émet l'événement input vers le parent
  @Output() change = new EventEmitter<Event>(); // Émet l'événement change vers le parent (pour select)
  @Output() filesSelected = new EventEmitter<File[]>(); // Émet les fichiers sélectionnés (pour file)
  @Output() fileError = new EventEmitter<{ file: File; error: string }>(); // Émet les erreurs de fichier (pour file)
  @Output() fileRemoved = new EventEmitter<File[]>(); // Émet les fichiers restants après suppression (pour file)

  @ViewChild('fileInput', { static: false }) fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dropZone', { static: false }) dropZone?: ElementRef<HTMLDivElement>;

  showPassword: boolean = false; // État pour afficher/masquer le mot de passe
  selectedFiles: File[] = []; // Fichiers sélectionnés (pour file)
  isDragging: boolean = false; // État de drag (pour file)
  isDropdownOpen: boolean = false; // État pour le dropdown select
  
  // Références aux listeners pour pouvoir les supprimer
  private dragOverHandler?: (e: DragEvent) => void;
  private dragLeaveHandler?: (e: DragEvent) => void;
  private dropHandler?: (e: DragEvent) => void;
  private dragEnterHandler?: (e: DragEvent) => void;
  private dragCounter: number = 0; // Compteur pour gérer les événements dragleave sur les enfants

  private computedMessage: string = '';
  private computedMessageType: InputMessageType | '' = '';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Recalculer le message automatique si la valeur, le type, ou les contraintes changent
    if (changes['value'] || changes['type'] || changes['required'] || changes['minLength'] || changes['touched'] || changes['dirty']) {
      this.computeAutoMessage();
      this.cdr.markForCheck();
    }
    // Synchroniser initialFiles avec selectedFiles si initialFiles change
    if (changes['initialFiles'] && this.type === 'file') {
      this.syncFilesFromInitial();
    }
  }

  /**
   * Synchronise selectedFiles avec initialFiles
   */
  private syncFilesFromInitial(): void {
    const currentFiles = this.initialFiles || [];
    
    if (this.selectedFiles.length !== currentFiles.length || 
        (currentFiles.length > 0 && this.filesAreDifferent(this.selectedFiles, currentFiles))) {
      this.selectedFiles = currentFiles.length > 0 ? [...currentFiles] : [];
      this.computeAutoMessage();
      this.cdr.detectChanges();
    }
  }

  /**
   * Vérifie si deux tableaux de fichiers sont différents
   */
  private filesAreDifferent(files1: File[], files2: File[]): boolean {
    return files1.some((file, index) => 
      !files2[index] || file.name !== files2[index].name || file.size !== files2[index].size
    );
  }

  ngAfterViewInit(): void {
    if (this.type === 'select') {
      document.addEventListener('click', this.handleClickOutside.bind(this));
    }
    if (this.type === 'file' && this.dropZone) {
      this.setupDragAndDrop();
      if (this.selectedFiles.length === 0 && this.initialFiles?.length > 0) {
        this.selectedFiles = [...this.initialFiles];
        this.computeAutoMessage();
        setTimeout(() => this.cdr.markForCheck(), 0);
      }
    }
  }


  ngOnDestroy(): void {
    if (this.type === 'select') {
      document.removeEventListener('click', this.handleClickOutside.bind(this));
    }
    if (this.type === 'file' && this.dropZone) {
      this.removeDragAndDropListeners();
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
    
    // Émettre l'événement change
      const changeEvent = new Event('change', { bubbles: true });
      this.change.emit(changeEvent);
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
   * Calcule automatiquement le message de validation en fonction du type d'input
   */
  private computeAutoMessage(): void {
    // Si un message personnalisé est fourni, l'utiliser
    if (this.message && this.messageType) {
      this.computedMessage = this.message;
      this.computedMessageType = this.messageType;
      return;
    }

    const isTouched = this.touched || this.dirty;

    // Validation selon le type
    switch (this.type) {
      case 'password':
        this.validatePassword(isTouched);
        break;
      case 'text':
      case 'email':
        if (this.checkRequired(isTouched)) return;
        if (this.checkMinLength(isTouched)) return;
        break;
      case 'select':
        if (this.checkRequired(isTouched)) return;
        break;
      case 'file':
        this.validateFileInput(isTouched);
        return;
    }

    // Pas de message par défaut
    this.computedMessage = '';
    this.computedMessageType = '';
  }

  /**
   * Valide le champ password
   */
  private validatePassword(isTouched: boolean): void {
      const length = this.value?.length || 0;
      if (length > 0 && length < 10) {
        const missing = 10 - length;
        this.computedMessage = `Il manque ${missing} caractère${missing > 1 ? 's' : ''} pour que votre mot de passe ait 10 caractères`;
        this.computedMessageType = 'warning';
        return;
      }
    this.checkRequired(isTouched);
  }

  /**
   * Valide le champ file
   */
  private validateFileInput(isTouched: boolean): void {
    if (this.required && this.selectedFiles.length === 0 && isTouched) {
        this.computedMessage = 'Ce champ est requis';
        this.computedMessageType = 'error';
        return;
      }
    // Ne pas afficher de message de succès pour les fichiers sélectionnés
    // Le fichier est visible dans la liste, pas besoin de message
    this.computedMessage = '';
    this.computedMessageType = '';
  }

  /**
   * Vérifie si le champ requis est vide
   */
  private checkRequired(isTouched: boolean): boolean {
    if (this.required && !this.value && isTouched) {
        this.computedMessage = 'Ce champ est requis';
        this.computedMessageType = 'error';
      return true;
    }
    return false;
      }
      
  /**
   * Vérifie si la longueur minimale est respectée
   */
  private checkMinLength(isTouched: boolean): boolean {
    const length = this.value?.length || 0;
    if (this.minLength > 0 && length > 0 && length < this.minLength && isTouched) {
        this.computedMessage = `Minimum ${this.minLength} caractères requis`;
        this.computedMessageType = 'error';
      return true;
    }
    return false;
  }

  @HostBinding('class')
  get hostClasses(): string {
    const classes = [`ui-input`, `ui-input--${this.type}`];
    const messageType = this.getDisplayMessageType();
    if (messageType) {
      classes.push(`ui-input--${messageType}`);
    }
    if (this.type === 'file') {
      if (this.isDragging) classes.push('ui-input--dragging');
      if (this.selectedFiles.length > 0) classes.push('ui-input--has-files');
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

  /**
   * Retourne les classes CSS pour l'input selon le type de message
   */
  getInputStateClasses(): Record<string, boolean> {
    const messageType = this.getDisplayMessageType();
    return {
      error: messageType === 'error',
      success: messageType === 'success',
      warning: messageType === 'warning',
      info: messageType === 'info',
    };
  }

  private readonly typeDefaults: Record<string, { placeholder: string; name: string }> = {
    email: { placeholder: 'Email', name: 'email' },
    password: { placeholder: 'Mot de passe', name: 'password' },
  };

  get displayPlaceholder(): string {
    return this.placeholder || this.typeDefaults[this.type]?.placeholder || '';
  }

  get displayName(): string {
    return this.name || this.typeDefaults[this.type]?.name || 'text';
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

  // ============================================
  // Méthodes pour le type file
  // ============================================

  /**
   * Configure les événements drag & drop
   */
  private setupDragAndDrop(): void {
    if (!this.dropZone) return;
    
    const element = this.dropZone.nativeElement;
    
    // Créer les handlers avec bind pour pouvoir les supprimer
    this.dragOverHandler = this.handleDragOver.bind(this);
    this.dragLeaveHandler = this.handleDragLeave.bind(this);
    this.dropHandler = this.handleDrop.bind(this);
    this.dragEnterHandler = this.handleDragEnter.bind(this);
    
    // Ajouter les listeners
    element.addEventListener('dragenter', this.dragEnterHandler);
    element.addEventListener('dragover', this.dragOverHandler);
    element.addEventListener('dragleave', this.dragLeaveHandler);
    element.addEventListener('drop', this.dropHandler);
  }

  /**
   * Supprime les listeners drag & drop
   */
  private removeDragAndDropListeners(): void {
    if (!this.dropZone) return;
    
    const element = this.dropZone.nativeElement;
    
    // Supprimer les listeners
    if (this.dragOverHandler) {
      element.removeEventListener('dragover', this.dragOverHandler);
    }
    if (this.dragLeaveHandler) {
      element.removeEventListener('dragleave', this.dragLeaveHandler);
    }
    if (this.dropHandler) {
      element.removeEventListener('drop', this.dropHandler);
    }
    if (this.dragEnterHandler) {
      element.removeEventListener('dragenter', this.dragEnterHandler);
    }
  }

  /**
   * Gère l'événement dragenter
   */
  private handleDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter++;
    this.setDraggingState(true);
  }

  /**
   * Gère l'événement dragover (nécessaire pour permettre le drop)
   */
  private handleDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.setDraggingState(true);
  }

  /**
   * Définit l'état de dragging
   */
  private setDraggingState(value: boolean): void {
    if (!this.disabled && !this.isDragging && value) {
      this.isDragging = true;
      this.cdr.markForCheck();
    }
  }

  /**
   * Gère l'événement dragleave
   */
  private handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter--;
    // Ne désactiver le dragging que si on quitte complètement la zone
    if (this.dragCounter === 0) {
      this.isDragging = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Gère l'événement drop
   */
  private handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    this.dragCounter = 0; // Réinitialiser le compteur
    
    if (this.disabled) return;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFiles(Array.from(files));
    }
    
    this.cdr.markForCheck();
  }

  /**
   * Gère la sélection de fichiers via le bouton
   */
  onFileInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      this.processFiles(Array.from(files));
    }
    this.cdr.markForCheck();
  }

  /**
   * Traite les fichiers sélectionnés
   */
  private processFiles(files: File[]): void {
    const validFiles: File[] = [];
    const errors: { file: File; error: string }[] = [];

    files.forEach(file => {
      const error = this.validateFile(file);
      if (error) {
        errors.push({ file, error });
      } else {
        validFiles.push(file);
      }
    });

    errors.forEach(error => this.fileError.emit(error));

    if (validFiles.length > 0) {
      this.selectedFiles = this.multiple 
        ? [...this.selectedFiles, ...validFiles]
        : [validFiles[0]];
      this.filesSelected.emit(this.selectedFiles);
      this.updateFileInputValue();
      this.computeAutoMessage();
      this.cdr.markForCheck();
    }
  }

  /**
   * Valide un fichier et retourne un message d'erreur si invalide
   */
  private validateFile(file: File): string | null {
    if (this.accept !== '*/*' && !this.isFileTypeValid(file)) {
      return `Type de fichier non autorisé. Types acceptés: ${this.accept}`;
    }
    if (this.maxSize > 0 && file.size > this.maxSize) {
      const maxSizeMB = (this.maxSize / 1024 / 1024).toFixed(2);
      return `Fichier trop volumineux. Taille maximale: ${maxSizeMB} MB`;
    }
    return null;
  }

  /**
   * Vérifie si le type de fichier est valide
   */
  private isFileTypeValid(file: File): boolean {
    if (this.accept === '*/*') return true;
    
    return this.accept.split(',').some(type => {
      const trimmed = type.trim();
      if (trimmed.endsWith('/*')) {
        return file.type.startsWith(trimmed.split('/')[0] + '/');
      }
      return file.type === trimmed;
    });
  }

  /**
   * Met à jour la valeur de l'input file
   */
  private updateFileInputValue(): void {
    if (this.fileInput) {
      // Réinitialiser l'input pour permettre de sélectionner le même fichier
      this.fileInput.nativeElement.value = '';
    }
  }

  /**
   * Supprime un fichier de la liste
   */
  removeFile(index: number): void {
    if (this.disabled) return;
    
    this.selectedFiles.splice(index, 1);
    if (this.selectedFiles.length === 0) {
      this.selectedFiles = [];
    }
    
    this.computeAutoMessage();
    this.filesSelected.emit(this.selectedFiles);
    this.fileRemoved.emit(this.selectedFiles);
    this.cdr.detectChanges();
  }

  /**
   * Ouvre le sélecteur de fichiers
   */
  openFileSelector(): void {
    if (this.disabled || !this.fileInput) return;
    this.fileInput.nativeElement.click();
  }

  /**
   * Formate la taille d'un fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Retourne le nom du fichier (ou les noms si plusieurs)
   */
  get fileDisplayName(): string {
    if (this.selectedFiles.length === 0) {
      return this.placeholder || 'Glissez-déposez vos fichiers ici ou cliquez pour sélectionner';
    }
    if (this.selectedFiles.length === 1) {
      return this.selectedFiles[0].name;
    }
    return `${this.selectedFiles.length} fichier(s) sélectionné(s)`;
  }

  /**
   * Détermine quelle icône afficher selon le type de fichier accepté
   */
  get fileTypeIcon(): string {
    return this.accept.includes('image') ? 'image' : 'file';
  }

}

