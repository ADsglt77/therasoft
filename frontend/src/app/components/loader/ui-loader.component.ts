import { Component, Input, ChangeDetectionStrategy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LoaderSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-loader.component.html',
  styleUrl: './ui-loader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiLoaderComponent {
  @Input() size: LoaderSize = 'md';
  @Input() inline: boolean = false;
  @Input() label?: string;

  @HostBinding('class')
  get hostClasses(): string {
    return [
      'ui-loader',
      `ui-loader--${this.size}`,
      this.inline ? 'ui-loader--inline' : 'ui-loader--block',
    ]
      .filter(Boolean)
      .join(' ');
  }

  @HostBinding('attr.aria-busy')
  get ariaBusy(): boolean {
    return true;
  }

  @HostBinding('attr.role')
  get role(): string {
    return 'status';
  }
}

