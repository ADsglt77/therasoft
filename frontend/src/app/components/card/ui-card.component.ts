import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../icon/app-icon.component';

export interface CardPoint {
  icon: string;
  text: string;
}

@Component({
  selector: 'ui-card',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './ui-card.component.html',
  styleUrl: './ui-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiCardComponent {
  @Input() icon?: string; // 1 icône à côté du titre
  @Input() title?: string;
  @Input() description?: string;
  @Input() points?: CardPoint[]; // Points avec icônes différentes

  @HostBinding('class')
  get hostClasses(): string {
    return 'ui-card ui-card--hover';
  }
}
