import { Component, Input, ChangeDetectionStrategy, HostBinding, HostListener, ElementRef } from '@angular/core';

export type ButtonColor = 'primary900' | 'primary700' | 'primary500' | 'primary300' | 'primary100' | 'gray100' | 'connect';
export type ButtonSize = 'sm' | 'md';

@Component({
  selector: 'ui-button',
  standalone: true,
  templateUrl: './ui-button.component.html',
  styleUrl: './ui-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiButtonComponent {
  @Input() color: ButtonColor = 'primary700';
  @Input() size: ButtonSize = 'md';
  @Input() block: boolean = false;
  @Input() disabled: boolean = false;

  constructor(private readonly el: ElementRef<HTMLElement>) {}

  // Accessibilité : <ui-button> est un élément custom (ng-content). On le rend
  // focusable et activable au clavier (Entrée / Espace) comme un vrai bouton.
  @HostBinding('attr.role') readonly role = 'button';

  @HostBinding('attr.tabindex')
  get tabindex(): number {
    return this.disabled ? -1 : 0;
  }

  @HostBinding('attr.aria-disabled')
  get ariaDisabled(): string | null {
    return this.disabled ? 'true' : null;
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.disabled) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.el.nativeElement.click();
    }
  }

  @HostBinding('class')
  get hostClasses(): string {
    return [
      'ui-button',
      `ui-button--${this.color}`,
      this.size === 'sm' ? 'ui-button--sm' : '',
      this.block ? 'ui-button--block' : '',
      this.disabled ? 'ui-button--disabled' : '',
    ].filter(Boolean).join(' ');
  }

  @HostBinding('attr.disabled')
  get isDisabled(): boolean | null {
    return this.disabled ? true : null;
  }
}

