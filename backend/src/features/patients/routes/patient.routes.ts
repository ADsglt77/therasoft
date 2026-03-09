import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { patientService } from '../services/patient.service';
import { verifyAccessToken } from '../../auth/middlewares/jwt.middleware';
import { patientRdvParamsSchema } from '../schemas/patient.schemas';
import { updateObservationsSchema } from '../schemas/dossier.schemas';
import { uploadAudioSchema } from '../schemas/dossier-audio.schemas';
import { createAudioRecordingSchema, updateAudioRecordingNameSchema } from '../schemas/audio-recording.schemas';
import { ApiError } from '../../../middlewares/errorHandler';
import { fileStorageService } from '../../../utils/file-storage';

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

/**
 * POST /api/patients/:patientId/rdv/:rdvId/dossier/observations/audio
 * Upload un enregistrement audio pour les observations
 */
router.post(
  '/:patientId/rdv/:rdvId/dossier/observations/audio',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`[AudioUpload] Requête reçue pour patient ${req.params.patientId}, rdv ${req.params.rdvId}`);
      const params = patientRdvParamsSchema.parse(req.params);
      
      // Vérifier que le fichier audio est présent (en base64)
      if (!req.body.audio || typeof req.body.audio !== 'string') {
        console.error(`[AudioUpload] Fichier audio manquant ou invalide`);
        throw new ApiError('Fichier audio manquant ou invalide', 'BAD_REQUEST', 400);
      }
      
      console.log(`[AudioUpload] Fichier audio présent, type: ${typeof req.body.audio}, longueur: ${req.body.audio.length}`);

      // Parser les métadonnées
      const metadata = uploadAudioSchema.parse({
        duration: parseInt(req.body.duration, 10),
        transcript: req.body.transcript || undefined,
      });

      // Convertir base64 en Buffer
      let audioBuffer: Buffer;
      try {
        // Supprimer le préfixe data URL si présent (data:audio/mpeg;base64,...)
        const base64Data = req.body.audio.includes(',')
          ? req.body.audio.split(',')[1]
          : req.body.audio;
        console.log(`[AudioUpload] Taille base64: ${base64Data.length} caractères`);
        audioBuffer = Buffer.from(base64Data, 'base64');
        console.log(`[AudioUpload] Buffer créé: ${audioBuffer.length} bytes`);
      } catch (error) {
        console.error(`[AudioUpload] Erreur conversion base64:`, error);
        throw new ApiError('Format base64 invalide', 'BAD_REQUEST', 400);
      }

      // Générer un nom de fichier unique
      const extension = req.body.mimeType?.includes('mpeg') ? 'mp3' : 'webm';
      const fileName = fileStorageService.generateFileName(
        params.patientId,
        params.rdvId,
        extension
      );

      // Sauvegarder le fichier
      const audioUrl = await fileStorageService.saveAudioFile(
        audioBuffer,
        fileName
      );

      // Mettre à jour le dossier
      const dossier = await patientService.updateAudioRecording(
        params.patientId,
        params.rdvId,
        audioUrl,
        metadata.duration,
        metadata.transcript
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

/**
 * GET /api/patients/:patientId/rdv/:rdvId/dossier/observations/audio
 * Récupère le fichier audio des observations
 */
router.get(
  '/:patientId/rdv/:rdvId/dossier/observations/audio',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = patientRdvParamsSchema.parse(req.params);
      
      // Récupérer le dossier pour obtenir l'URL du fichier
      const dossier = await patientService.getDossierByPatientAndRdv(
        params.patientId,
        params.rdvId
      );

      if (!dossier.observationsAudioUrl) {
        throw new ApiError('Aucun enregistrement audio trouvé', 'NOT_FOUND', 404);
      }

      // Récupérer le fichier
      console.log(`[AudioGet] URL du fichier: ${dossier.observationsAudioUrl}`);
      const audioBuffer = await fileStorageService.getAudioFile(
        dossier.observationsAudioUrl
      );
      console.log(`[AudioGet] Fichier récupéré: ${audioBuffer.length} bytes`);

      // Déterminer le type MIME
      const mimeType = dossier.observationsAudioUrl.endsWith('.mp3')
        ? 'audio/mpeg'
        : 'audio/webm';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', audioBuffer.length.toString());
      res.send(audioBuffer);
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
 * DELETE /api/patients/:patientId/rdv/:rdvId/dossier/observations/audio
 * Supprime l'enregistrement audio des observations
 */
router.delete(
  '/:patientId/rdv/:rdvId/dossier/observations/audio',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = patientRdvParamsSchema.parse(req.params);
      
      // Récupérer le dossier pour obtenir l'URL du fichier à supprimer
      const dossier = await patientService.getDossierByPatientAndRdv(
        params.patientId,
        params.rdvId
      );

      // Supprimer le fichier si il existe
      if (dossier.observationsAudioUrl) {
        await fileStorageService.deleteAudioFile(dossier.observationsAudioUrl);
      }

      // Mettre à jour le dossier
      const updatedDossier = await patientService.deleteAudioRecording(
        params.patientId,
        params.rdvId
      );

      res.json(updatedDossier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ApiError('Paramètres invalides', 'BAD_REQUEST', 400));
      } else {
        next(error);
      }
    }
  }
);

// ========== Enregistrements audio multiples ==========

/**
 * GET /api/patients/:patientId/rdv/:rdvId/dossier/audio-recordings
 * Récupère tous les enregistrements audio d'un dossier
 */
router.get(
  '/:patientId/rdv/:rdvId/dossier/audio-recordings',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = patientRdvParamsSchema.parse(req.params);
      const recordings = await patientService.getMultipleAudioRecordings(
        params.patientId,
        params.rdvId
      );
      res.json(recordings);
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
 * POST /api/patients/:patientId/rdv/:rdvId/dossier/audio-recordings
 * Crée un nouvel enregistrement audio avec nom
 */
router.post(
  '/:patientId/rdv/:rdvId/dossier/audio-recordings',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = patientRdvParamsSchema.parse(req.params);
      
      // Log pour debug
      console.log('[AudioRecording] Données reçues:', {
        name: req.body.name,
        audioLength: req.body.audio?.length,
        mimeType: req.body.mimeType,
        duration: req.body.duration,
        durationType: typeof req.body.duration,
        transcript: req.body.transcript ? 'présent' : 'absent',
      });
      
      const body = createAudioRecordingSchema.parse(req.body);

      // Convertir base64 en Buffer
      let audioBuffer: Buffer;
      try {
        const base64Data = body.audio.includes(',')
          ? body.audio.split(',')[1]
          : body.audio;
        audioBuffer = Buffer.from(base64Data, 'base64');
      } catch (error) {
        throw new ApiError('Format base64 invalide', 'BAD_REQUEST', 400);
      }

      // Générer un nom de fichier unique (extraire le type de base du mimeType)
      const baseMimeType = body.mimeType.split(';')[0]; // Enlever les paramètres comme 'codecs=opus'
      const extension = baseMimeType.includes('mpeg') ? 'mp3' : 'webm';
      const fileName = fileStorageService.generateFileName(
        params.patientId,
        params.rdvId,
        extension
      );

      // Sauvegarder le fichier
      const audioUrl = await fileStorageService.saveAudioFile(
        audioBuffer,
        fileName
      );

      // Créer l'enregistrement dans la base de données
      const recording = await patientService.createMultipleAudioRecording(
        params.patientId,
        params.rdvId,
        body.name,
        audioUrl,
        body.duration,
        body.mimeType,
        body.transcript
      );

      res.json(recording);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[AudioRecording] Erreur de validation Zod:', JSON.stringify(error.errors, null, 2));
        next(new ApiError('Données invalides', 'BAD_REQUEST', 400, error.errors));
      } else {
        next(error);
      }
    }
  }
);

/**
 * GET /api/patients/:patientId/rdv/:rdvId/dossier/audio-recordings/:recordingId
 * Récupère un fichier audio spécifique
 */
router.get(
  '/:patientId/rdv/:rdvId/dossier/audio-recordings/:recordingId',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = patientRdvParamsSchema.parse(req.params);
      const recordingId = parseInt(req.params.recordingId, 10);

      if (isNaN(recordingId)) {
        throw new ApiError('ID d\'enregistrement invalide', 'BAD_REQUEST', 400);
      }

      // Récupérer l'enregistrement pour obtenir l'URL
      const recordings = await patientService.getMultipleAudioRecordings(
        params.patientId,
        params.rdvId
      );

      const recording = recordings.find((r) => r.id === recordingId);
      if (!recording) {
        throw new ApiError('Enregistrement audio non trouvé', 'NOT_FOUND', 404);
      }

      // Récupérer le fichier
      const audioBuffer = await fileStorageService.getAudioFile(recording.url);

      // Déterminer le type MIME
      const mimeType = recording.mimeType || 'audio/webm';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', audioBuffer.length.toString());
      res.send(audioBuffer);
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
 * PATCH /api/patients/:patientId/rdv/:rdvId/dossier/audio-recordings/:recordingId
 * Met à jour le nom d'un enregistrement audio
 */
router.patch(
  '/:patientId/rdv/:rdvId/dossier/audio-recordings/:recordingId',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = patientRdvParamsSchema.parse(req.params);
      const recordingId = parseInt(req.params.recordingId, 10);
      const body = updateAudioRecordingNameSchema.parse(req.body);

      if (isNaN(recordingId)) {
        throw new ApiError('ID d\'enregistrement invalide', 'BAD_REQUEST', 400);
      }

      const recording = await patientService.updateMultipleAudioRecordingName(
        params.patientId,
        params.rdvId,
        recordingId,
        body.name
      );

      res.json(recording);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ApiError('Données invalides', 'BAD_REQUEST', 400));
      } else {
        next(error);
      }
    }
  }
);

/**
 * DELETE /api/patients/:patientId/rdv/:rdvId/dossier/audio-recordings/:recordingId
 * Supprime un enregistrement audio spécifique
 */
router.delete(
  '/:patientId/rdv/:rdvId/dossier/audio-recordings/:recordingId',
  verifyAccessToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = patientRdvParamsSchema.parse(req.params);
      const recordingId = parseInt(req.params.recordingId, 10);

      if (isNaN(recordingId)) {
        throw new ApiError('ID d\'enregistrement invalide', 'BAD_REQUEST', 400);
      }

      // Récupérer l'enregistrement pour obtenir l'URL du fichier à supprimer
      const recordings = await patientService.getMultipleAudioRecordings(
        params.patientId,
        params.rdvId
      );

      const recording = recordings.find((r) => r.id === recordingId);
      if (recording) {
        // Supprimer le fichier
        await fileStorageService.deleteAudioFile(recording.url);
      }

      // Supprimer l'enregistrement de la base de données
      await patientService.deleteMultipleAudioRecording(
        params.patientId,
        params.rdvId,
        recordingId
      );

      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ApiError('Paramètres invalides', 'BAD_REQUEST', 400));
      } else {
        next(error);
      }
    }
  }
);

export default router;

