import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Protège les routes nécessitant une authentification.
 * La session Better Auth (cookie) fait foi ; redirige vers /login sinon.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  return authService.restoreSession().pipe(
    map((user) => {
      if (user) {
        return true;
      }
      notificationService.show('warning', 'Veuillez vous connecter.', 5000);
      return router.createUrlTree(['/login']);
    })
  );
};
