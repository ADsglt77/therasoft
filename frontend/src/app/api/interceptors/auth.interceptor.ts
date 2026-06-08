import { HttpInterceptorFn } from '@angular/common/http';
import { isApiRequest } from '../../core/constants/api-routes';

/**
 * Interceptor qui ajoute withCredentials aux requêtes API pour BetterAuth
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Ajouter withCredentials pour toutes les requêtes API
  if (isApiRequest(req.url)) {
    const clonedReq = req.clone({
      withCredentials: true
    });
    return next(clonedReq);
  }

  return next(req);
};
