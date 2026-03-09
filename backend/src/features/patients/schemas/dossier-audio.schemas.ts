import { z } from 'zod';

/**
 * Schéma de validation pour l'upload d'un enregistrement audio
 */
export const uploadAudioSchema = z.object({
  duration: z.number().int().positive().max(300, 'La durée maximale est de 5 minutes (300 secondes)'),
  transcript: z.string().optional(), // Transcription optionnelle
});

export type UploadAudio = z.infer<typeof uploadAudioSchema>;



