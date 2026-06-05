import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

export type BadgeVariant = 'warning' | 'success' | 'danger' | 'repos' | 'vacances' | 'ferie';

@Component({
  selector: 'ui-badge',
  standalone: true,
  imports: [],
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

