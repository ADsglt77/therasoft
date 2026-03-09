import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { patientService } from '../services/patient.service';
import { verifyAccessToken } from '../../auth/middlewares/jwt.middleware';
import { patientRdvParamsSchema } from '../schemas/patient.schemas';
import { updateObservationsSchema } from '../schemas/dossier.schemas';
import { ApiError } from '../../../middlewares/errorHandler';

const router = Router();

/**
 * GET /api/patients/:patientId/rdv/:rdvId/dossier
 * Récupère le dossier médical d'un patient pour un RDV spécifique
 */
router.get(
  '/:patientId/rdv/:rdvId/dossier',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = patientRdvParamsSchema.parse(req.params);
      const dossier = await patientService.getDossierByPatientAndRdv(
        params.patientId,
        params.rdvId
      );

      res.json(dossier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ApiError('Paramètres invalides', 'BAD_REQUEST', 400));
      } else {
        next(error);
      }
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
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = patientRdvParamsSchema.parse(req.params);
      const body = updateObservationsSchema.parse(req.body);

      const dossier = await patientService.updateObservations(
        params.patientId,
        params.rdvId,
        body.observations
      );

      res.json(dossier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ApiError('Données invalides', 'BAD_REQUEST', 400));
      } else {
        next(error);
      }
    }
  }
);

export default router;
