import { Router, Request, Response } from 'express';
import { planningService } from '../services/planning.service';
import { rdvService } from '../services/rdv.service';
import {
  getPlanningQuerySchema,
  getRdvsMeQuerySchema,
  GetPlanningQuery,
  GetRdvsMeQuery,
} from '../schemas/planning.schemas';
import { verifyAccessToken } from '../../auth/middlewares/jwt.middleware';
import { ApiError } from '../../../middlewares/errorHandler';
import { validateQuery } from '../../../middlewares/validate';
import { asyncHandler } from '../../../middlewares/asyncHandler';

const router = Router();

function requireMedecinId(req: Request): number {
  if (!req.user?.medecinId) {
    throw new ApiError('Utilisateur non authentifié', 'UNAUTHORIZED', 401);
  }
  return req.user.medecinId;
}

/**
 * GET /api/planning
 * Récupère les vacations du médecin connecté pour une période donnée
 * Query params (optionnels): startDate, endDate (format YYYY-MM-DD)
 * Par défaut: mois courant
 */
router.get(
  '/',
  verifyAccessToken,
  validateQuery(getPlanningQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { startDate, endDate } = req.query as unknown as GetPlanningQuery;
    const vacations = await planningService.getVacationsByMedecin(medecinId, startDate, endDate);
    res.json({ vacations, count: vacations.length });
  })
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
  validateQuery(getRdvsMeQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { date } = req.query as unknown as GetRdvsMeQuery;
    const rdvs = await rdvService.getRdvsByMedecinAndDate(medecinId, date);
    res.json({ rdvs, count: rdvs.length });
  })
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
  validateQuery(getPlanningQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { startDate, endDate } = req.query as unknown as GetPlanningQuery;
    const rdvs = await rdvService.getRdvsByDateRange(medecinId, startDate, endDate);
    res.json({ rdvs, count: rdvs.length });
  })
);

export default router;
