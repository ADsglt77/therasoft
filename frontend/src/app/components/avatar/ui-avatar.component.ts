import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'ui-avatar',
  standalone: true,
  templateUrl: './ui-avatar.component.html',
  styleUrl: './ui-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiAvatarComponent {
  @Input() initial: string = '?';
  @Input() avatarUrl?: string | null;

  @HostBinding('class')
  get hostClasses(): string {
    return 'ui-avatar';
  }
}

