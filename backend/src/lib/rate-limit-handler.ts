import type { Request, Response } from 'express';

export function createRateLimitHandler(message: string) {
  return (req: Request, res: Response): void => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message,
        details: null,
      },
      requestId: req.headers['x-request-id'] || 'unknown',
    });
  };
}
