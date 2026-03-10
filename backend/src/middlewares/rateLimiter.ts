import rateLimit from 'express-rate-limit';

/**
 * Rate limiter pour les routes d'authentification.
 * 10 tentatives par fenêtre de 15 minutes par IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Trop de tentatives. Réessayez dans 15 minutes.',
  },
});
