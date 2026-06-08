import { Router, Request, Response } from 'express';
import { planningService } from '../services/planning.service';
import {
  getPlanningQuerySchema,
  getRdvsMeQuerySchema,
  GetPlanningQuery,
  GetRdvsMeQuery,
} from '../schemas/planning.schemas';
import { verifySession } from '../../../middlewares/session.middleware';
import { requireMedecinId } from '../../../middlewares/requireProfile';
import { validateQuery } from '../../../middlewares/validate';
import { asyncHandler } from '../../../middlewares/asyncHandler';

const router = Router();

router.get(
  '/',
  verifySession,
  validateQuery(getPlanningQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { startDate, endDate } = req.query as unknown as GetPlanningQuery;
    const vacations = await planningService.getVacationsByMedecin(medecinId, startDate, endDate);
    res.json({ vacations, count: vacations.length });
  })
);

router.get(
  '/rdvs/me',
  verifySession,
  validateQuery(getRdvsMeQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { date } = req.query as unknown as GetRdvsMeQuery;
    const rdvs = await planningService.getRdvsByMedecinAndDate(medecinId, date);
    res.json({ rdvs, count: rdvs.length });
  })
);

router.get(
  '/rdvs',
  verifySession,
  validateQuery(getPlanningQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { startDate, endDate } = req.query as unknown as GetPlanningQuery;
    const rdvs = await planningService.getRdvsByDateRange(medecinId, startDate, endDate);
    res.json({ rdvs, count: rdvs.length });
  })
);

export default router;
