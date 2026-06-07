import { HttpInterceptorFn } from '@angular/common/http';
import { isApiRequest } from '../../core/constants/api-routes';

/**
 * Interceptor qui active les cookies de session Better Auth sur les requêtes API.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (isApiRequest(req.url)) {
    return next(
      req.clone({
        withCredentials: true,
      })
    );
  }

  return next(req);
};

