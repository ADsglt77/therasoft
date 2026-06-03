import { Router, Request, Response } from 'express';
import { dossierService } from '../services/dossier.service';
import { dossierFileService } from '../services/dossier-file.service';
import { verifyAccessToken } from '../../../middlewares/jwt.middleware';
import { requireMedecinId } from '../../../middlewares/requireMedecin';
import {
  patientRdvParamsSchema,
  patientRdvFileParamsSchema,
  PatientRdvParams,
  PatientRdvFileParams,
} from '../schemas/dossier-params.schemas';
import { updateObservationsSchema } from '../schemas/dossier.schemas';
import { validateBody, validateParams } from '../../../middlewares/validate';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { uploadDossierFiles, verifyUploadedMagicBytes } from '../../../middlewares/upload';
import { ApiError } from '../../../middlewares/errorHandler';
import { recordAudit, clientIp } from '../../../lib/audit';

const router = Router();

router.get(
  '/:patientId/rdv/:rdvId/dossier',
  verifyAccessToken,
  validateParams(patientRdvParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { patientId, rdvId } = req.params as unknown as PatientRdvParams;
    const dossier = await dossierService.getDossierByPatientAndRdv(patientId, rdvId, medecinId);
    recordAudit({ medecinId, action: 'DOSSIER_READ', resource: 'dossier', resourceId: dossier.id, ip: clientIp(req) });
    res.json(dossier);
  })
);

router.patch(
  '/:patientId/rdv/:rdvId/dossier/observations',
  verifyAccessToken,
  validateParams(patientRdvParamsSchema),
  validateBody(updateObservationsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { patientId, rdvId } = req.params as unknown as PatientRdvParams;
    const dossier = await dossierService.updateObservations(
      patientId,
      rdvId,
      req.body.observations,
      medecinId
    );
    recordAudit({
      medecinId,
      action: 'DOSSIER_OBSERVATIONS_UPDATE',
      resource: 'dossier',
      resourceId: dossier.id,
      ip: clientIp(req),
    });
    res.json(dossier);
  })
);

router.post(
  '/:patientId/rdv/:rdvId/dossier/files',
  verifyAccessToken,
  validateParams(patientRdvParamsSchema),
  (req: Request, res: Response, next) => {
    uploadDossierFiles(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de l'upload";
        return next(new ApiError(message, 'UPLOAD_ERROR', 400));
      }
      next();
    });
  },
  verifyUploadedMagicBytes,
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { patientId, rdvId } = req.params as unknown as PatientRdvParams;
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw new ApiError('Aucun fichier envoyé', 'BAD_REQUEST', 400);
    }
    const result = await dossierFileService.uploadFiles(patientId, rdvId, medecinId, files);
    recordAudit({
      medecinId,
      action: 'DOSSIER_FILE_UPLOAD',
      resource: 'dossier_file',
      resourceId: result.map((f) => f.id).join(','),
      ip: clientIp(req),
    });
    res.status(201).json(result);
  })
);

router.delete(
  '/:patientId/rdv/:rdvId/dossier/files/:fileId',
  verifyAccessToken,
  validateParams(patientRdvFileParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { patientId, rdvId, fileId } = req.params as unknown as PatientRdvFileParams;
    await dossierFileService.deleteFile(patientId, rdvId, fileId, medecinId);
    recordAudit({
      medecinId,
      action: 'DOSSIER_FILE_DELETE',
      resource: 'dossier_file',
      resourceId: fileId,
      ip: clientIp(req),
    });
    res.status(204).end();
  })
);

router.get(
  '/:patientId/rdv/:rdvId/dossier/files/:fileId/download',
  verifyAccessToken,
  validateParams(patientRdvFileParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { patientId, rdvId, fileId } = req.params as unknown as PatientRdvFileParams;
    const { absolutePath, originalName, mimeType } = await dossierFileService.getFilePath(
      patientId,
      rdvId,
      fileId,
      medecinId
    );
    recordAudit({
      medecinId,
      action: 'DOSSIER_FILE_DOWNLOAD',
      resource: 'dossier_file',
      resourceId: fileId,
      ip: clientIp(req),
    });
    res.setHeader('Content-Disposition', contentDisposition(originalName));
    res.setHeader('Content-Type', mimeType);
    res.sendFile(absolutePath);
  })
);

function contentDisposition(originalName: string): string {
  const asciiFallback = originalName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(originalName);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export default router;
