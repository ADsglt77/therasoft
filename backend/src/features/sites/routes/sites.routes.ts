import { Router, Request, Response } from 'express';
import { sitesService } from '../services/sites.service';
import { verifyAccessToken } from '../../../middlewares/jwt.middleware';
import { requireMedecinId } from '../../../middlewares/requireMedecin';
import { asyncHandler } from '../../../middlewares/asyncHandler';

const router = Router();

router.get(
  '/',
  verifyAccessToken,
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const sites = await sitesService.getSitesByMedecin(medecinId);
    res.json({ sites, count: sites.length });
  })
);

export default router;
