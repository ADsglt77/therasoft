import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { ApiErrorHandler } from '../../core/utils/api-error-handler';
import {
  AUTH_NO_REFRESH_ROUTES,
  AUTH_COMPONENT_HANDLED_ROUTES,
  matchesRoute,
  isApiRequest,
} from '../../core/constants/api-routes';
import { AuthService } from '../../core/services/auth.service';

/**
 * Interceptor qui gère les erreurs HTTP, notamment les 401 (non autorisé)
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notificationService = inject(NotificationService);
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
      if (error.status === 401 && isApiRequest(req.url)) {
        if (matchesRoute(req.url, AUTH_NO_REFRESH_ROUTES)) {
          return throwError(() => error);
        }

        if (router.url === '/login' || router.url === '/register') {
          return throwError(() => error);
        }

        if (matchesRoute(req.url, AUTH_COMPONENT_HANDLED_ROUTES)) {
          return throwError(() => error);
        }

        const extracted = ApiErrorHandler.extractError(error);
        forceReLogin(extracted.message);
      }

      return throwError(() => error);
    })
  );
};
