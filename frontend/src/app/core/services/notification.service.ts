import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NotificationVariant } from '../../shared/ui/notification-container/notification-container.component';

export interface Notification {
  id: string;
  variant: NotificationVariant;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);

  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  show(variant: NotificationVariant, text: string, duration: number = 3000): void {
    const notification: Notification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      variant,
      text,
    };

    const current = this.notifications$.value;
    this.notifications$.next([...current, notification]);

    // Auto-remove after duration
    setTimeout(() => {
      this.remove(notification.id);
    }, duration);
  }

  remove(id: string): void {
    const current = this.notifications$.value;
    this.notifications$.next(current.filter((n) => n.id !== id));
  }

  clear(): void {
    this.notifications$.next([]);
  }
}

