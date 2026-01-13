import { Request, Response, NextFunction } from 'express';

/**
 * Classe d'erreur API
 */
export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, code: string = 'INTERNAL_ERROR', statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware de gestion d'erreurs global
 * Formate les erreurs selon le standard: { error: { code, message, details }, requestId }
 */
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Une erreur est survenue';

  res.status(statusCode).json({
    error: {
      code,
      message,
      details: err.details || null,
    },
    requestId,
  });
};




