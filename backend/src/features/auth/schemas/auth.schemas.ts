import { z } from 'zod';
import { Sexe } from '@prisma/client';

/**
 * Schémas de validation des routes profil/adresse.
 * (L'inscription, la connexion et la réinitialisation de mot de passe sont
 * désormais gérées par Better Auth — voir lib/auth.ts.)
 */

/** Recherche d'adresses (autocomplétion via l'API Adresse gouv.fr). */
export const addressSearchSchema = z.object({
  q: z.string().min(3, 'Au moins 3 caractères').max(200),
});

export type AddressSearchQuery = z.infer<typeof addressSearchSchema>;

function parisDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

const dateNaissanceSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de naissance invalide')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Date de naissance invalide')
  .refine((value) => value <= parisDateKey(), {
    message: 'La date de naissance ne peut pas être dans le futur',
  })
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

/** Modification du profil (médecin ou patient). */
export const updateProfileSchema = z
  .object({
    nom: z.string().min(1, 'Le nom est requis').max(100).optional(),
    prenom: z.string().min(1, 'Le prénom est requis').max(100).optional(),
    dateNaissance: dateNaissanceSchema.optional(),
    sexe: z.nativeEnum(Sexe).optional(),
    adresse: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    medecinId: z.coerce.number().optional(),
    specialite: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.latitude === undefined) !== (value.longitude === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['latitude'],
        message: 'Latitude et longitude doivent être renseignées ensemble',
      });
    }
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Mise à jour de l'avatar : URL HTTP(S) ou data URL base64 (image uploadée).
 */
export const updateAvatarSchema = z.object({
  avatarUrl: z
    .string()
    .max(10000000, "L'avatar ne doit pas dépasser 10 millions de caractères") // ~10 Mo en base64
    .refine(
      (val) =>
        !val ||
        val.startsWith('http://') ||
        val.startsWith('https://') ||
        val.startsWith('data:'),
      { message: "L'avatar doit être une URL valide ou une data URL base64" }
    )
    .optional()
    .nullable(),
  avatarFileName: z
    .string()
    .max(255, 'Le nom du fichier ne doit pas dépasser 255 caractères')
    .optional()
    .nullable(),
});

export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
