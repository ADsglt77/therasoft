import { Router, Request, Response, NextFunction } from 'express';
import { planningService } from '../services/planning.service';
import { rdvService } from '../services/rdv.service';
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

/**
 * GET /api/planning/rdvs/me
 * Récupère les rendez-vous du médecin connecté pour une date spécifique
 * Query params: date (format YYYY-MM-DD, requis)
 * IMPORTANT: Cette route doit être définie AVANT /rdvs pour qu'Express la matche correctement
 */
router.get(
  '/rdvs/me',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.medecinId) {
        throw new ApiError('Utilisateur non authentifié', 'UNAUTHORIZED', 401);
      }

      const { date } = req.query;
      if (!date || typeof date !== 'string') {
        throw new ApiError('Le paramètre date est requis (format YYYY-MM-DD)', 'BAD_REQUEST', 400);
      }

      // Parser la date
      const dateParts = date.split('-');
      if (dateParts.length !== 3) {
        throw new ApiError('Format de date invalide. Utilisez YYYY-MM-DD', 'BAD_REQUEST', 400);
      }

      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Les mois sont 0-indexés
      const day = parseInt(dateParts[2], 10);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new ApiError('Format de date invalide. Utilisez YYYY-MM-DD', 'BAD_REQUEST', 400);
      }

      const targetDate = new Date(year, month, day);
      const rdvs = await rdvService.getRdvsByMedecinAndDate(
        req.user.medecinId,
        targetDate
      );

      res.json({ rdvs, count: rdvs.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/planning/rdvs
 * Récupère les rendez-vous pour une période donnée
 * Query params (optionnels): startDate, endDate (format YYYY-MM-DD)
 * Par défaut: mois courant
 */
router.get(
  '/rdvs',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = getPlanningQuerySchema.parse(req.query);
      const rdvs = await rdvService.getRdvsByDateRange(
        query.startDate,
        query.endDate
      );

      res.json({ rdvs, count: rdvs.length });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

