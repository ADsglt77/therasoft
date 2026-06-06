import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Réserve une route au personnel médical (rôle MEDECIN / SECRETAIRE). */
export const medecinGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  if (authService.isPatient()) {
    router.navigate(['/prendre-rendez-vous']);
    return false;
  }
  return true;
};

/** Réserve une route aux patients (rôle PATIENT). */
export const patientGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  if (!authService.isPatient()) {
    router.navigate(['/calendar']);
    return false;
  }
  return true;
};
