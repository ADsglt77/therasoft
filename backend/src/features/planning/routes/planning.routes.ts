import { Router, Request, Response, NextFunction } from 'express';
import { planningService } from '../services/planning.service';
import { getPlanningQuerySchema } from '../schemas/planning.schemas';
import { verifyAccessToken } from '../../auth/middlewares/jwt.middleware';
import { ApiError } from '../../../middlewares/errorHandler';

const router = Router();

/**
 * GET /api/planning
 * Récupère les vacations du médecin connecté pour une période donnée
 * Query params (optionnels): startDate, endDate (format YYYY-MM-DD)
 * Par défaut: mois courant
 */
router.get(
  '/',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.medecinId) {
        throw new ApiError('Utilisateur non authentifié', 'UNAUTHORIZED', 401);
      }

      const query = getPlanningQuerySchema.parse(req.query);
      const vacations = await planningService.getVacationsByMedecin(
        req.user.medecinId,
        query.startDate,
        query.endDate
      );

      res.json({ vacations, count: vacations.length });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

