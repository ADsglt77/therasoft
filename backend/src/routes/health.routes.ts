import { Router } from 'express';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

export default router;




