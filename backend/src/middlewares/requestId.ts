import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware qui ajoute un X-Request-Id unique à chaque requête
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const supplied = req.headers['x-request-id'];
  const requestId =
    typeof supplied === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(supplied)
      ? supplied
      : randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
