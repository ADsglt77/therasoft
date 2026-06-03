import rateLimit from 'express-rate-limit';
import { ApiError } from './errorHandler';

/**
 * Rate limiter pour les routes d'authentification.
 * 10 tentatives par fenêtre de 15 minutes par IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new ApiError(
        'Trop de tentatives. Réessayez dans 15 minutes.',
        'RATE_LIMIT_EXCEEDED',
        429
      )
    );
  },
});
