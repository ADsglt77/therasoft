import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

function createRoleGuard(
  isAllowed: (role: string) => boolean,
  fallbackRoute: string
): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.restoreSession().pipe(
      map((user) => {
        if (!user) {
          return router.createUrlTree(['/login']);
        }
        return isAllowed(user.role) ? true : router.createUrlTree([fallbackRoute]);
      })
    );
  };
}

/** Réserve une route au personnel médical (rôle MEDECIN). */
export const medecinGuard = createRoleGuard(
  (role) => role !== 'PATIENT',
  '/prendre-rendez-vous'
);

/** Réserve une route aux patients (rôle PATIENT). */
export const patientGuard = createRoleGuard((role) => role === 'PATIENT', '/calendar');
