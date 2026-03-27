import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { AUTH_PUBLIC_ROUTES, matchesRoute, isApiRequest } from '../../core/constants/api-routes';

/**
 * Interceptor qui ajoute le Bearer token aux requêtes authentifiées
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const token = tokenStorage.getAccessToken();

  // Ne pas ajouter le token pour les routes publiques d'auth
  if (matchesRoute(req.url, AUTH_PUBLIC_ROUTES)) {
    return next(req);
  }

  // Ajouter le token pour toutes les autres requêtes API
  if (token && isApiRequest(req.url)) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(clonedReq);
  }

  return next(req);
};

