import { z } from 'zod';

export const updateObservationsSchema = z.object({
  observations: z.union([
    z
      .string()
      .min(
        1,
        'Les observations ne peuvent pas être une chaîne vide. Utilisez null pour supprimer.'
      ),
    z.null(),
  ]),
});

export const setVerifiedSchema = z.object({
  verified: z.boolean(),
});
