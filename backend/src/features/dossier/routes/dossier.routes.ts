import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { dossierService } from '../services/dossier.service';
import { dossierFileService } from '../services/dossier-file.service';
import { verifySession } from '../../../middlewares/session.middleware';
import { requireMedecinId } from '../../../middlewares/requireProfile';
import {
  patientRdvParamsSchema,
  patientRdvFileParamsSchema,
  PatientRdvParams,
  PatientRdvFileParams,
} from '../schemas/dossier-params.schemas';
import { updateObservationsSchema, setVerifiedSchema } from '../schemas/dossier.schemas';
import { validateBody, validateParams } from '../../../middlewares/validate';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { uploadDossierFiles, verifyUploadedMagicBytes } from '../../../middlewares/upload';
import { ApiError } from '../../../middlewares/errorHandler';
import { recordAudit } from '../../../lib/audit';
import { assertDossierAccess } from '../services/dossier.shared';
import { removeUploadedFiles } from '../../../lib/dossier-storage';
import { createRateLimitHandler } from '../../../lib/rate-limit-handler';

const router = Router();
const dossierUploadLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createRateLimitHandler("Trop d'envois de fichiers, veuillez réessayer plus tard"),
});

router.get(
  '/:patientId/rdv/:rdvId/dossier',
  verifySession,
  validateParams(patientRdvParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { patientId, rdvId } = req.params as unknown as PatientRdvParams;
    const dossier = await dossierService.getDossierByPatientAndRdv(patientId, rdvId, medecinId);
    recordAudit({
      medecinId,
      action: 'DOSSIER_READ',
      resource: 'dossier',
      resourceId: dossier.id,
      ip: req.ip,
    });
    res.json(dossier);
  })
);

router.patch(
  '/:patientId/rdv/:rdvId/dossier/observations',
  verifySession,
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
      ip: req.ip,
    });
    res.json(dossier);
  })
);

router.patch(
  '/:patientId/rdv/:rdvId/dossier/verified',
  verifySession,
  validateParams(patientRdvParamsSchema),
  validateBody(setVerifiedSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { patientId, rdvId } = req.params as unknown as PatientRdvParams;
    const dossier = await dossierService.setVerified(
      patientId,
      rdvId,
      req.body.verified,
      medecinId
    );
    recordAudit({
      medecinId,
      action: 'DOSSIER_VERIFIED_UPDATE',
      resource: 'dossier',
      resourceId: dossier.id,
      ip: req.ip,
    });
    res.json(dossier);
  })
);

router.post(
  '/:patientId/rdv/:rdvId/dossier/files',
  verifySession,
  validateParams(patientRdvParamsSchema),
  dossierUploadLimiter,
  asyncHandler(async (req: Request, _res: Response, next) => {
    const { patientId, rdvId } = req.params as unknown as PatientRdvParams;
    await assertDossierAccess(patientId, rdvId, requireMedecinId(req));
    next();
  }),
  (req: Request, res: Response, next) => {
    uploadDossierFiles(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de l'upload";
        void removeUploadedFiles((req.files as Express.Multer.File[]) ?? []).finally(() => {
          next(new ApiError(message, 'UPLOAD_ERROR', 400));
        });
        return;
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
      resourceId: result.files.map((f) => f.id).join(','),
      ip: req.ip,
    });
    res.status(201).json(result);
  })
);

router.delete(
  '/:patientId/rdv/:rdvId/dossier/files/:fileId',
  verifySession,
  validateParams(patientRdvFileParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecinId = requireMedecinId(req);
    const { patientId, rdvId, fileId } = req.params as unknown as PatientRdvFileParams;
    const status = await dossierFileService.deleteFile(patientId, rdvId, fileId, medecinId);
    recordAudit({
      medecinId,
      action: 'DOSSIER_FILE_DELETE',
      resource: 'dossier_file',
      resourceId: fileId,
      ip: req.ip,
    });
    res.json(status);
  })
);

router.get(
  '/:patientId/rdv/:rdvId/dossier/files/:fileId/download',
  verifySession,
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
      ip: req.ip,
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
