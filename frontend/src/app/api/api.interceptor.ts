import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { extractApiError } from '../core/utils/errors';

const componentHandledAuthRoutes = [
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/sign-out',
  '/auth/change-password',
  '/auth/forget-password',
  '/auth/reset-password',
  '/auth/verify-email',
] as const;

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.includes('/api/')) {
    return next(request);
  }

  const router = inject(Router);
  const notificationService = inject(NotificationService);
  const authService = inject(AuthService);
  const apiRequest = request.clone({
    withCredentials: true,
    setHeaders: {
      'X-Request-Id': request.headers.get('X-Request-Id') ?? crypto.randomUUID(),
    },
  });

  return next(apiRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      const onAuthPage = router.url.startsWith('/login') || router.url.startsWith('/register');
      const handledByComponent = componentHandledAuthRoutes.some((route) =>
        request.url.includes(route)
      );

      if (error.status === 401 && !onAuthPage && !handledByComponent) {
        authService.clearSession();
        notificationService.show(
          'danger',
          extractApiError(error).message || 'Session expirée. Veuillez vous reconnecter.',
          5000
        );
        void router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
