import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Génère un UUID v4 simple
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Interceptor qui ajoute un X-Request-Id unique à chaque requête HTTP
 */
export const requestIdInterceptor: HttpInterceptorFn = (req, next) => {
  const requestId = req.headers.get('X-Request-Id') || generateUUID();
  const clonedReq = req.clone({
    setHeaders: {
      'X-Request-Id': requestId,
    },
  });
  return next(clonedReq);
};

