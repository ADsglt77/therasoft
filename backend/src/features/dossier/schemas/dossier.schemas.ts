import { z } from 'zod';

export const updateObservationsSchema = z.object({
  observations: z.union([
    z.string().min(1, 'Les observations ne peuvent pas être une chaîne vide. Utilisez null pour supprimer.'),
    z.null(),
  ]),
});

export type UpdateObservations = z.infer<typeof updateObservationsSchema>;

export const setVerifiedSchema = z.object({
  verified: z.boolean(),
});

export type SetVerified = z.infer<typeof setVerifiedSchema>;
