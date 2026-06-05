import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Guard pour protéger les routes nécessitant une authentification
 * Redirige vers /login si l'utilisateur n'est pas connecté
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Afficher une notification
  notificationService.show('warning', 'Veuillez vous connecter.', 5000);

  // Rediriger vers la page de connexion
  router.navigate(['/login']);

  return false;
};

