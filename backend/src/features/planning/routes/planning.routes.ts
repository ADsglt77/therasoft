import { Router, Request, Response, NextFunction } from 'express';
import { planningService } from '../services/planning.service';
import { rdvService } from '../services/rdv.service';
import { getPlanningQuerySchema, getRdvsMeQuerySchema } from '../schemas/planning.schemas';
import { verifyAccessToken } from '../../auth/middlewares/jwt.middleware';
import { ApiError } from '../../../middlewares/errorHandler';
import { z } from 'zod';

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

      const { date: targetDate } = getRdvsMeQuerySchema.parse(req.query);
      const rdvs = await rdvService.getRdvsByMedecinAndDate(
        req.user.medecinId,
        targetDate
      );

      res.json({ rdvs, count: rdvs.length });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ApiError('Le paramètre date est requis (format YYYY-MM-DD)', 'BAD_REQUEST', 400));
      }
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
      if (!req.user?.medecinId) {
        throw new ApiError('Utilisateur non authentifié', 'UNAUTHORIZED', 401);
      }

      const query = getPlanningQuerySchema.parse(req.query);
      const rdvs = await rdvService.getRdvsByDateRange(
        req.user.medecinId,
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

