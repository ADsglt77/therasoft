import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent, UiCardComponent, UiBadgeComponent, UiAvatarComponent, MenuHamburgerComponent, MenuMainComponent, MenuDashboardComponent, UiInputComponent, CardPoint, NotificationVariant } from '../../shared/ui';
import { NotificationService } from '../../core/services/notification.service';

/**
 * Page UI Playground - Pour tester et visualiser les composants UI
 */
@Component({
  selector: 'app-playground-page',
  standalone: true,
  imports: [CommonModule, UiButtonComponent, UiCardComponent, UiBadgeComponent, UiAvatarComponent, MenuHamburgerComponent, MenuMainComponent, MenuDashboardComponent, UiInputComponent],
  templateUrl: './playground-page.component.html',
  styleUrl: './playground-page.component.scss',
})

export class PlaygroundPageComponent {
  constructor(private notificationService: NotificationService) {}

  showNotification(variant: NotificationVariant): void {
    this.notificationService.show(variant, `Here the message you want to show - ${variant}`);
  }
  points1: CardPoint[] = [
    { icon: 'sparkles', text: 'Point 1' },
    { icon: 'check', text: 'Point 2' },
    { icon: 'star', text: 'Point 3' }
  ];

  points2: CardPoint[] = [
    { icon: 'circle', text: 'Point 2' },
    { icon: 'check', text: 'Point 3' }
  ];

  points3: CardPoint[] = [
    { icon: 'circle', text: 'Point 1' },
    { icon: 'star', text: 'Point 2' },
    { icon: 'heart', text: 'Point 3' }
  ];
}

