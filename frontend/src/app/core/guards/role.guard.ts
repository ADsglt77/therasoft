import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Réserve une route au personnel médical (rôle MEDECIN). */
export const medecinGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.restoreSession().pipe(
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/login']);
      }
      return user.role === 'PATIENT' ? router.createUrlTree(['/prendre-rendez-vous']) : true;
    })
  );
};

/** Réserve une route aux patients (rôle PATIENT). */
export const patientGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.restoreSession().pipe(
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/login']);
      }
      return user.role === 'PATIENT' ? true : router.createUrlTree(['/calendar']);
    })
  );
};
