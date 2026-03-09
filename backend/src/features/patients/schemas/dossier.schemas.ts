import { z } from 'zod';

/**
 * Schéma de validation pour la mise à jour des observations
 * Les observations peuvent être null ou une chaîne non vide
 * Les chaînes vides sont rejetées (doivent être null)
 */
export const updateObservationsSchema = z.object({
  observations: z.union([
    z.string().min(1, 'Les observations ne peuvent pas être une chaîne vide. Utilisez null pour supprimer.'),
    z.null(),
  ]),
});

export type UpdateObservations = z.infer<typeof updateObservationsSchema>;
