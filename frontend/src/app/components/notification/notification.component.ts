import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { NotificationService, Notification } from '../../core/services/notification.service';
import { AppIconComponent } from '../icon/app-icon.component';
import { Subscription } from 'rxjs';

export type NotificationVariant = 'warning' | 'success' | 'danger' | 'information';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscription = this.notificationService.getNotifications().subscribe((notifications) => {
      this.notifications = notifications;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  removeNotification(id: string): void {
    this.notificationService.remove(id);
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
      default:
        return 'var(--color-warning-up)';
    }
  }
}

