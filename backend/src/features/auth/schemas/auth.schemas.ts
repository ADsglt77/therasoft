import { z } from 'zod';

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

/** Modification du profil (médecin ou patient). */
export const updateProfileSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(100).optional(),
  prenom: z.string().min(1, 'Le prénom est requis').max(100).optional(),
  adresse: z.string().optional(),
  medecinId: z.coerce.number().optional(),
  specialite: z.string().optional(),
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
