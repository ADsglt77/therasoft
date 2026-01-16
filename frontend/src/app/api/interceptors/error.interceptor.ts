import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { NotificationService } from '../../core/services/notification.service';
import { ApiErrorHandler } from '../../core/utils/api-error-handler';
import { TokenRefreshService } from '../../core/services/token-refresh.service';

/**
 * Interceptor qui gère les erreurs HTTP, notamment les 401 (non autorisé)
 * Tente de rafraîchir le token automatiquement avant de rediriger vers /login
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);
  const notificationService = inject(NotificationService);
  const tokenRefreshService = inject(TokenRefreshService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si l'erreur est 401 (non autorisé) et qu'on est sur une route API
      if (error.status === 401 && req.url.includes('/api/')) {
        // Ne pas tenter de refresh pour les routes d'authentification
        if (
          req.url.includes('/auth/login') ||
          req.url.includes('/auth/register') ||
          req.url.includes('/auth/refresh')
        ) {
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

        // Tenter de rafraîchir le token
        return tokenRefreshService.refreshToken().pipe(
          switchMap((newToken) => {
            // Refresh réussi : réessayer la requête originale avec le nouveau token
            const clonedReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
              },
            });
            return next(clonedReq).pipe(
              catchError((retryError) => {
                return throwError(() => retryError);
              })
            );
          }),
          catchError((refreshError) => {
            // Refresh échoué : nettoyer et rediriger vers login
            tokenStorage.clear();

            // Afficher une notification d'erreur
            const extracted = ApiErrorHandler.extractError(error);
            notificationService.show(
              'danger',
              extracted.message || 'Session expirée. Veuillez vous reconnecter.',
              5000
            );

            // Rediriger vers la page de connexion
            router.navigate(['/login']);

            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};

