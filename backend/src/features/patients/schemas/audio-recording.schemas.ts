import { z } from 'zod';

/**
 * Schéma de validation pour créer un nouvel enregistrement audio
 */
export const createAudioRecordingSchema = z.object({
  name: z.string().min(1, 'Le nom de l\'enregistrement est requis').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  audio: z.string().min(1, 'Le fichier audio est requis'), // Accepte base64 avec ou sans préfixe data URL
  mimeType: z.string().refine(
    val => val.startsWith('audio/mpeg') || val.startsWith('audio/webm'),
    'Le type MIME doit être audio/mpeg ou audio/webm (avec ou sans paramètres)'
  ),
  duration: z.coerce.number().int().min(1).max(300, 'La durée maximale est de 5 minutes (300 secondes)'), // Utilise coerce pour convertir string en number si nécessaire
  transcript: z.string().optional(),
});

export type CreateAudioRecording = z.infer<typeof createAudioRecordingSchema>;

/**
 * Schéma de validation pour mettre à jour le nom d'un enregistrement
 */
export const updateAudioRecordingNameSchema = z.object({
  name: z.string().min(1, 'Le nom de l\'enregistrement est requis').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
});

export type UpdateAudioRecordingName = z.infer<typeof updateAudioRecordingNameSchema>;

