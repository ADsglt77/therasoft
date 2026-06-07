import { z } from 'zod';

/**
 * Validation stricte du mot de passe
 * Un mot de passe est valide si:
 * - longueur >= 12
 * - contient au moins 1 majuscule [A-Z]
 * - contient au moins 1 minuscule [a-z]
 * - contient au moins 1 chiffre [0-9]
 * - contient au moins 1 caractère spécial [^A-Za-z0-9]
 * 
 * Exemples de tests:
 * - Valide: "Password123!" ✅
 * - Invalide: "password123!" ❌ (pas de majuscule)
 * - Invalide: "PASSWORD123!" ❌ (pas de minuscule)
 * - Invalide: "Password!!!!" ❌ (pas de chiffre)
 * - Invalide: "Password1234" ❌ (pas de spécial)
 * - Invalide: "Pass1!" ❌ (trop court, < 12)
 */
const passwordSchema = z
  .string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères.')
  .refine((password) => /[A-Z]/.test(password), {
    message: 'Le mot de passe doit contenir au moins 1 majuscule.',
  })
  .refine((password) => /[a-z]/.test(password), {
    message: 'Le mot de passe doit contenir au moins 1 minuscule.',
  })
  .refine((password) => /[0-9]/.test(password), {
    message: 'Le mot de passe doit contenir au moins 1 chiffre.',
  })
  .refine((password) => /[^A-Za-z0-9]/.test(password), {
    message: 'Le mot de passe doit contenir au moins 1 caractère spécial.',
  });

/**
 * Schéma de validation pour l'inscription
 */
export const registerSchema = z.object({
  email: z.string().email('Email invalide').min(3, 'L\'email doit contenir au moins 3 caractères').max(100),
  password: passwordSchema,
  nom: z.string().min(1, 'Le nom est requis').max(100),
  prenom: z.string().min(1, 'Le prénom est requis').max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schéma de validation pour l'auto-inscription d'un patient (+ choix du médecin).
 */
export const patientRegisterSchema = z.object({
  email: z.string().email('Email invalide').min(3, 'L\'email doit contenir au moins 3 caractères').max(100),
  password: passwordSchema,
  nom: z.string().min(1, 'Le nom est requis').max(100),
  prenom: z.string().min(1, 'Le prénom est requis').max(100),
  medecinId: z.coerce.number().int().positive('Veuillez choisir un médecin'),
  adresse: z.string().min(3, 'Veuillez renseigner votre adresse').max(200),
});

export type PatientRegisterInput = z.infer<typeof patientRegisterSchema>;

/**
 * Schéma de validation pour la recherche d'adresses (autocomplétion).
 */
export const addressSearchSchema = z.object({
  q: z.string().min(3, 'Au moins 3 caractères').max(200),
});

export type AddressSearchQuery = z.infer<typeof addressSearchSchema>;

/**
 * Schéma de validation pour la vérification d'email (jeton reçu par lien).
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Jeton invalide'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/**
 * Schémas pour la réinitialisation du mot de passe (mot de passe oublié).
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide').max(100),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Jeton invalide'),
  newPassword: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Schéma de validation pour la connexion
 */
export const loginSchema = z.object({
  email: z.string().email('Email invalide').min(1, 'L\'email est requis'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schéma de validation pour changer le mot de passe
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Schéma de validation pour modifier le profil
 */
export const updateProfileSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(100).optional(),
  prenom: z.string().min(1, 'Le prénom est requis').max(100).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Schéma de validation pour mettre à jour l'avatar
 * Accepte soit une URL HTTP(S) soit une data URL base64 (pour les images uploadées)
 */
export const updateAvatarSchema = z.object({
  avatarUrl: z.string()
    .max(10000000, 'L\'avatar ne doit pas dépasser 10 millions de caractères') // ~10MB en base64
    .refine(
      (val) => {
        if (!val) return true; // null/undefined est valide
        // Accepter les URLs HTTP/HTTPS ou les data URLs (base64)
        return val.startsWith('http://') || 
               val.startsWith('https://') || 
               val.startsWith('data:');
      },
      { message: 'L\'avatar doit être une URL valide ou une data URL base64' }
    )
    .optional()
    .nullable(),
  avatarFileName: z.string()
    .max(255, 'Le nom du fichier ne doit pas dépasser 255 caractères')
    .optional()
    .nullable(),
});

export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;

