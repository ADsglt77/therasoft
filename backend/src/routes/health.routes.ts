import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

/**
 * GET /api/health
 * Vérifie que l'API et la base de données répondent.
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    let db: 'ok' | 'error' = 'ok';

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'error';
    }

    const status = db === 'ok' ? 'ok' : 'degraded';
    const statusCode = db === 'ok' ? 200 : 503;

    res.status(statusCode).json({ status, db });
  })
);

export default router;
