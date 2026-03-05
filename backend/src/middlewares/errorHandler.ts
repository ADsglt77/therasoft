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
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';

  if (err instanceof ApiError) {
    console.error(`[${requestId}] ApiError ${err.statusCode} ${err.code}: ${err.message}`);

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null,
      },
      requestId,
    });
    return;
  }

  // Unexpected errors — log stack but don't expose internals
  console.error(`[${requestId}] Unhandled error:`, err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Une erreur interne est survenue',
      details: null,
    },
    requestId,
  });
};