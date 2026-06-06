import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { SelectOption } from '../input/ui-input.component';
import { AppIconComponent } from '../icon/app-icon.component';

/**
 * Combobox : champ de recherche + liste filtrée sélectionnable.
 * Émet la valeur sélectionnée via `valueChange` (réutilisable dans les formulaires).
 */
@Component({
  selector: 'ui-combobox',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './ui-combobox.component.html',
  styleUrl: './ui-combobox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiComboboxComponent {
  @Input() options: SelectOption[] = [];
  @Input() value: string | number = '';
  @Input() placeholder = 'Rechercher…';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();

  isOpen = false;
  search = '';

  constructor(private readonly el: ElementRef<HTMLElement>) {}

  get selectedLabel(): string {
    return this.options.find((o) => this.isSelected(o))?.label ?? '';
  }

  get displayValue(): string {
    return this.isOpen ? this.search : this.selectedLabel;
  }

  get filtered(): SelectOption[] {
    const q = this.search.trim().toLowerCase();
    return q ? this.options.filter((o) => o.label.toLowerCase().includes(q)) : this.options;
  }

  isSelected(opt: SelectOption): boolean {
    return String(opt.value) === String(this.value);
  }

  open(): void {
    if (!this.disabled) {
      this.isOpen = true;
      this.search = '';
    }
  }

  onInput(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
    this.isOpen = true;
  }

  select(opt: SelectOption): void {
    this.value = opt.value;
    this.search = '';
    this.isOpen = false;
    this.valueChange.emit(String(opt.value));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.isOpen = false;
      this.search = '';
    }
  }
}
