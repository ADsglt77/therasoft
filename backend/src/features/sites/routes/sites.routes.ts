import { Router, Request, Response } from 'express';
import { sitesService } from '../services/sites.service';
import { verifyAccessToken } from '../../../middlewares/jwt.middleware';
import { requireMedecinId } from '../../../middlewares/requireMedecin';
import { validateQuery } from '../../../middlewares/validate';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { getSitesQuerySchema, GetSitesQuery } from '../schemas/sites.schemas';

const router = Router();

router.get(
  '/',
  verifyAccessToken,
  validateQuery(getSitesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { q } = req.query as unknown as GetSitesQuery;
    const sites = await sitesService.getSitesByMedecin(medecinId, q);
    res.json({ sites, count: sites.length });
  })
);

export default router;
