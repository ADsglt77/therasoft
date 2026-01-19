import { z } from 'zod';

/**
 * Schéma de validation pour la mise à jour des observations
 */
export const updateObservationsSchema = z.object({
  observations: z.string().min(1, 'Les observations ne peuvent pas être vides'),
});

export type UpdateObservations = z.infer<typeof updateObservationsSchema>;

