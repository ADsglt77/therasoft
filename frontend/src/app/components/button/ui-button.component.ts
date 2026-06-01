import { Component, Input, ChangeDetectionStrategy, HostBinding } from '@angular/core';

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

