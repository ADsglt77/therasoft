import { Router, Request, Response, NextFunction } from 'express';
import { patientService } from '../services/patient.service';
import { verifyAccessToken } from '../../auth/middlewares/jwt.middleware';
import { patientRdvParamsSchema } from '../schemas/patient.schemas';
import { updateObservationsSchema } from '../schemas/dossier.schemas';
import { validateBody } from '../../../middlewares/validate';
import { ApiError } from '../../../middlewares/errorHandler';
import { z } from 'zod';

const router = Router();

/**
 * Middleware de validation des paramètres patient/rdv
 */
function validatePatientRdvParams(req: Request, _res: Response, next: NextFunction): void {
  try {
    req.params = patientRdvParamsSchema.parse(req.params) as any;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ApiError('Paramètres invalides', 'BAD_REQUEST', 400));
    }
    next(error);
  }
}

/**
 * GET /api/patients/:patientId/rdv/:rdvId/dossier
 * Récupère le dossier médical d'un patient pour un RDV spécifique
 */
router.get(
  '/:patientId/rdv/:rdvId/dossier',
  verifyAccessToken,
  validatePatientRdvParams,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId, rdvId } = req.params as any;
      const dossier = await patientService.getDossierByPatientAndRdv(patientId, rdvId);
      res.json(dossier);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/patients/:patientId/rdv/:rdvId/dossier/observations
 * Met à jour les observations médicales d'un dossier
 */
router.patch(
  '/:patientId/rdv/:rdvId/dossier/observations',
  verifyAccessToken,
  validatePatientRdvParams,
  validateBody(updateObservationsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId, rdvId } = req.params as any;
      const dossier = await patientService.updateObservations(
        patientId,
        rdvId,
        req.body.observations
      );
      res.json(dossier);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

