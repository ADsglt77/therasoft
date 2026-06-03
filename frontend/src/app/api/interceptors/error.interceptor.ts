import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { ApiErrorHandler } from '../../core/utils/api-error-handler';
import { TokenRefreshService } from '../../core/services/token-refresh.service';
import {
  AUTH_NO_REFRESH_ROUTES,
  AUTH_COMPONENT_HANDLED_ROUTES,
  AUTH_RETRY_HEADER,
  matchesRoute,
  isApiRequest,
} from '../../core/constants/api-routes';
import { AuthService } from '../../core/services/auth.service';

/**
 * Interceptor qui gère les erreurs HTTP, notamment les 401 (non autorisé)
 * Tente de rafraîchir le token automatiquement avant de rediriger vers /login
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notificationService = inject(NotificationService);
  const tokenRefreshService = inject(TokenRefreshService);
  const authService = inject(AuthService);

  const forceReLogin = (message?: string) => {
    authService.clearSession();
    notificationService.show(
      'danger',
      message || 'Session expirée. Veuillez vous reconnecter.',
      5000
    );
    void router.navigate(['/login']);
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si l'erreur est 401 (non autorisé) et qu'on est sur une route API
      if (error.status === 401 && isApiRequest(req.url)) {
        // Déjà retenté après refresh : ne pas boucler
        if (req.headers.has(AUTH_RETRY_HEADER)) {
          forceReLogin();
          return throwError(() => error);
        }
        // Ne pas tenter de refresh pour les routes d'authentification
        if (matchesRoute(req.url, AUTH_NO_REFRESH_ROUTES)) {
          return throwError(() => error);
        }

        // Ne pas rediriger si on est déjà sur /login ou /register
        if (router.url === '/login' || router.url === '/register') {
          return throwError(() => error);
        }

        // Ne pas rediriger pour les erreurs gérées dans le composant
        if (matchesRoute(req.url, AUTH_COMPONENT_HANDLED_ROUTES)) {
          return throwError(() => error);
        }

        // Tenter de rafraîchir le token
        return tokenRefreshService.refreshToken().pipe(
          switchMap((newToken) => {
            // Refresh réussi : réessayer la requête originale avec le nouveau token
            const clonedReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
                [AUTH_RETRY_HEADER]: 'true',
              },
            });
            return next(clonedReq).pipe(
              catchError((retryError: HttpErrorResponse) => {
                if (retryError.status === 401) {
                  const extracted = ApiErrorHandler.extractError(retryError);
                  forceReLogin(extracted.message);
                }
                return throwError(() => retryError);
              })
            );
          }),
          catchError((refreshError) => {
            const extracted = ApiErrorHandler.extractError(error);
            forceReLogin(extracted.message);
            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};

