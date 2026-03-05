import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ApiError } from './errorHandler';

/**
 * Middleware factory qui valide req.body avec un schéma Zod.
 * Si la validation échoue, retourne une ApiError 422 avec les détails Zod.
 * Sinon, attache le résultat parsé dans req.body et passe au handler suivant.
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ApiError('Données invalides', 'VALIDATION_ERROR', 422, error.errors));
      }
      next(error);
    }
  };
}
