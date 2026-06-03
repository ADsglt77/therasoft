import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Enrobe un handler asynchrone pour propager automatiquement les erreurs
 * au middleware d'erreurs Express, évitant les try/catch répétés.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
