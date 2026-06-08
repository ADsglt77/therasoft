import { Router, Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../../../lib/auth';
import { profileService } from '../services/profile.service';
import {
  updateProfileSchema,
  updateAvatarSchema,
  addressSearchSchema,
  AddressSearchQuery,
} from '../schemas/auth.schemas';
import { addressService } from '../services/address.service';
import { verifySession } from '../../../middlewares/jwt.middleware';
import { requireMedecinId, requirePatientId } from '../../../middlewares/requireMedecin';
import { validateBody, validateQuery } from '../../../middlewares/validate';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { prisma } from '../../../lib/prisma';

const router = Router();

// Better Auth handled in app.ts

// ---- Profile Medecin ----
router.get(
  '/me',
  verifySession,
  asyncHandler(async (req: Request, res: Response) => {
    const medecin = await profileService.getMedecin(requireMedecinId(req));
    res.status(200).json(medecin);
  })
);

router.patch(
  '/me',
  verifySession,
  validateBody(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecin = await profileService.updateMedecin(requireMedecinId(req), req.body);
    res.status(200).json(medecin);
  })
);

router.patch(
  '/avatar',
  verifySession,
  validateBody(updateAvatarSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecin = await profileService.updateAvatar(requireMedecinId(req), req.body);
    res.status(200).json(medecin);
  })
);

// ---- Patient Profile & Portal ----
router.get(
  '/address/search',
  validateQuery(addressSearchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query as unknown as AddressSearchQuery;
    res.json({ suggestions: await addressService.search(q) });
  })
);

router.get(
  '/medecins',
  asyncHandler(async (_req: Request, res: Response) => {
    const medecins = await prisma.medecin.findMany({
      where: { isActive: true },
      select: { id: true, nom: true, prenom: true, specialite: true },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });
    res.status(200).json({ medecins });
  })
);

router.get(
  '/patient/me',
  verifySession,
  asyncHandler(async (req: Request, res: Response) => {
    const patient = await profileService.getPatient(requirePatientId(req));
    res.status(200).json(patient);
  })
);

router.patch(
  '/patient/me',
  verifySession,
  validateBody(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const patient = await profileService.updatePatient(requirePatientId(req), req.body);
    res.status(200).json(patient);
  })
);

export default router;
