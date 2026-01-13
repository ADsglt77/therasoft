import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { NotificationService } from '../../core/services/notification.service';
import { ApiErrorHandler } from '../../core/utils/api-error-handler';

/**
 * Interceptor qui gère les erreurs HTTP, notamment les 401 (non autorisé)
 * Affiche une notification d'erreur et redirige vers /login
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si l'erreur est 401 (non autorisé) et qu'on est sur une route API
      if (error.status === 401 && req.url.includes('/api/')) {
        // Ne pas rediriger si on est déjà sur la page de login/register
        if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
          return throwError(() => error);
        }

        // Ne pas rediriger si on est déjà sur /login ou /register
        if (router.url === '/login' || router.url === '/register') {
          return throwError(() => error);
        }

        // Ne pas rediriger pour les erreurs de changement de mot de passe (gérées dans le composant)
        if (req.url.includes('/auth/password')) {
          return throwError(() => error);
        }

        // Nettoyer le token expiré/invalide
        tokenStorage.clear();

        // Afficher une notification d'erreur
        const extracted = ApiErrorHandler.extractError(error);
        notificationService.show('danger', extracted.message || 'Session expirée. Veuillez vous reconnecter.', 5000);

        // Rediriger vers la page de connexion
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};

