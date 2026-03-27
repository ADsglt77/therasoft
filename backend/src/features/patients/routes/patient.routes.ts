import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { patientService } from '../services/patient.service';
import { verifyAccessToken } from '../../auth/middlewares/jwt.middleware';
import { patientRdvParamsSchema, PatientRdvParams } from '../schemas/patient.schemas';
import { updateObservationsSchema } from '../schemas/dossier.schemas';
import { validateBody } from '../../../middlewares/validate';
import { ApiError } from '../../../middlewares/errorHandler';

const router = Router();

/**
 * Parse et valide les paramètres patient/rdv depuis la requête
 */
function parsePatientRdvParams(req: Request): PatientRdvParams {
  try {
    return patientRdvParamsSchema.parse(req.params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('Paramètres invalides', 'BAD_REQUEST', 400);
    }
    throw error;
  }
}

/**
 * GET /api/patients/:patientId/rdv/:rdvId/dossier
 * Récupère le dossier médical d'un patient pour un RDV spécifique
 */
router.get(
  '/:patientId/rdv/:rdvId/dossier',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.medecinId) {
        throw new ApiError('Utilisateur non authentifié', 'UNAUTHORIZED', 401);
      }
      const { patientId, rdvId } = parsePatientRdvParams(req);
      const dossier = await patientService.getDossierByPatientAndRdv(patientId, rdvId, req.user.medecinId);
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
  validateBody(updateObservationsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.medecinId) {
        throw new ApiError('Utilisateur non authentifié', 'UNAUTHORIZED', 401);
      }
      const { patientId, rdvId } = parsePatientRdvParams(req);
      const dossier = await patientService.updateObservations(
        patientId,
        rdvId,
        req.body.observations,
        req.user.medecinId
      );
      res.json(dossier);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
