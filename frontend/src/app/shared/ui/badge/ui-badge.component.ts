import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'warning' | 'success' | 'danger' | 'repos';

@Component({
  selector: 'ui-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-badge.component.html',
  styleUrl: './ui-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiBadgeComponent {
  @Input() variant: BadgeVariant = 'repos';
  @Input() text: string = 'TEXT';

  @HostBinding('class')
  get hostClasses(): string {
    return `ui-badge ui-badge--${this.variant}`;
  }
}

