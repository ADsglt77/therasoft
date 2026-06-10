import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type NotificationVariant = 'warning' | 'success' | 'danger' | 'information';

export interface Notification {
  id: string;
  variant: NotificationVariant;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly notificationsSubject = new BehaviorSubject<Notification[]>([]);
  readonly notifications$ = this.notificationsSubject.asObservable();

  show(variant: NotificationVariant, text: string, duration: number = 3000): void {
    const notification: Notification = {
      id: crypto.randomUUID(),
      variant,
      text,
    };

    this.notificationsSubject.next([...this.notificationsSubject.value, notification]);

    setTimeout(() => {
      this.remove(notification.id);
    }, duration);
  }

  remove(id: string): void {
    this.notificationsSubject.next(
      this.notificationsSubject.value.filter((notification) => notification.id !== id)
    );
  }
}

