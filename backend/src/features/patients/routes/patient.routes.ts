import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { patientService } from '../services/patient.service';
import { dossierFileService } from '../services/dossier-file.service';
import { verifyAccessToken } from '../../auth/middlewares/jwt.middleware';
import { patientRdvParamsSchema, PatientRdvParams } from '../schemas/patient.schemas';
import { updateObservationsSchema } from '../schemas/dossier.schemas';
import { validateBody } from '../../../middlewares/validate';
import { uploadDossierFiles } from '../../../middlewares/upload';
import { ApiError } from '../../../middlewares/errorHandler';

const router = Router();

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

function requireAuth(req: Request): number {
  if (!req.user?.medecinId) {
    throw new ApiError('Utilisateur non authentifié', 'UNAUTHORIZED', 401);
  }
  return req.user.medecinId;
}

// ─── Dossier ────────────────────────────────────────────────

router.get(
  '/:patientId/rdv/:rdvId/dossier',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const medecinId = requireAuth(req);
      const { patientId, rdvId } = parsePatientRdvParams(req);
      const dossier = await patientService.getDossierByPatientAndRdv(patientId, rdvId, medecinId);
      res.json(dossier);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:patientId/rdv/:rdvId/dossier/observations',
  verifyAccessToken,
  validateBody(updateObservationsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const medecinId = requireAuth(req);
      const { patientId, rdvId } = parsePatientRdvParams(req);
      const dossier = await patientService.updateObservations(
        patientId, rdvId, req.body.observations, medecinId
      );
      res.json(dossier);
    } catch (error) {
      next(error);
    }
  }
);

// ─── Fichiers de dossier ────────────────────────────────────

router.post(
  '/:patientId/rdv/:rdvId/dossier/files',
  verifyAccessToken,
  (req: Request, res: Response, next: NextFunction) => {
    uploadDossierFiles(req, res, (err: any) => {
      if (err) {
        return next(new ApiError(err.message || 'Erreur lors de l\'upload', 'UPLOAD_ERROR', 400));
      }
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const medecinId = requireAuth(req);
      const { patientId, rdvId } = parsePatientRdvParams(req);
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new ApiError('Aucun fichier envoyé', 'BAD_REQUEST', 400);
      }
      const result = await dossierFileService.uploadFiles(patientId, rdvId, medecinId, files);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:patientId/rdv/:rdvId/dossier/files',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const medecinId = requireAuth(req);
      const { patientId, rdvId } = parsePatientRdvParams(req);
      const files = await dossierFileService.listFiles(patientId, rdvId, medecinId);
      res.json(files);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:patientId/rdv/:rdvId/dossier/files/:fileId',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const medecinId = requireAuth(req);
      const { patientId, rdvId } = parsePatientRdvParams(req);
      const fileId = parseInt(req.params.fileId, 10);
      if (isNaN(fileId)) {
        throw new ApiError('ID fichier invalide', 'BAD_REQUEST', 400);
      }
      await dossierFileService.deleteFile(patientId, rdvId, fileId, medecinId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:patientId/rdv/:rdvId/dossier/files/:fileId/download',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const medecinId = requireAuth(req);
      const { patientId, rdvId } = parsePatientRdvParams(req);
      const fileId = parseInt(req.params.fileId, 10);
      if (isNaN(fileId)) {
        throw new ApiError('ID fichier invalide', 'BAD_REQUEST', 400);
      }
      const { absolutePath, originalName, mimeType } = await dossierFileService.getFilePath(
        patientId, rdvId, fileId, medecinId
      );
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
      res.setHeader('Content-Type', mimeType);
      res.sendFile(absolutePath);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
