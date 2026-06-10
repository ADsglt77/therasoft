import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  NotificationService,
  NotificationVariant,
} from '../../core/services/notification.service';
import { AppIconComponent } from '../icon/app-icon.component';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [AsyncPipe, AppIconComponent],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent {
  readonly notifications$;

  constructor(readonly notificationService: NotificationService) {
    this.notifications$ = notificationService.notifications$;
  }

  getIconColor(variant: NotificationVariant): string {
    switch (variant) {
      case 'warning':
        return 'var(--color-warning-up)';
      case 'success':
        return 'var(--color-success-up)';
      case 'danger':
        return 'var(--color-danger-up)';
      case 'information':
        return 'var(--color-primary-900)';
    }
  }
}

