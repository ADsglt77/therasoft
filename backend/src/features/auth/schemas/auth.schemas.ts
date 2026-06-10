import { Sexe } from '@prisma/client';
import { z } from 'zod';
import { dateKeySchema, parisDateKey } from '../../../lib/dates';

export const addressSearchSchema = z.object({
  q: z.string().trim().min(3, 'Au moins 3 caracteres').max(200),
});

export type AddressSearchQuery = z.infer<typeof addressSearchSchema>;

const dateNaissanceSchema = dateKeySchema
  .refine((value) => value <= parisDateKey(), {
    message: 'La date de naissance ne peut pas etre dans le futur',
  })
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const profileNameFields = {
  nom: z.string().trim().min(1, 'Le nom est requis').max(100).optional(),
  prenom: z.string().trim().min(1, 'Le prenom est requis').max(100).optional(),
};

export const updateMedecinProfileSchema = z.object(profileNameFields).strict();

export const updatePatientProfileSchema = z
  .object({
    ...profileNameFields,
    dateNaissance: dateNaissanceSchema.optional(),
    sexe: z.nativeEnum(Sexe).optional(),
    adresse: z.string().trim().min(3, "L'adresse est trop courte").max(300).optional(),
    medecinId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export type UpdateMedecinProfileInput = z.infer<typeof updateMedecinProfileSchema>;
export type UpdatePatientProfileInput = z.infer<typeof updatePatientProfileSchema>;

export const updateAvatarSchema = z.object({
  avatarUrl: z
    .string()
    .max(10_000_000, "L'avatar ne doit pas depasser 10 millions de caracteres")
    .refine(
      (value) =>
        !value ||
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        /^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=\r\n]+$/.test(value),
      { message: "L'avatar doit etre une URL HTTP(S) ou une image PNG, JPEG ou WebP" }
    )
    .optional()
    .nullable(),
});

export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
