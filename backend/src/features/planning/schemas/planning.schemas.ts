import { z } from 'zod';

/**
 * Format de date YYYY-MM-DD, transformé en objet Date local (sans décalage UTC).
 * Helper unique réutilisé partout pour garantir un parsing cohérent des dates.
 */
const dateStringToLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide. Utilisez YYYY-MM-DD').transform((val) => {
  const [year, month, day] = val.split('-').map(Number);
  return new Date(year, month - 1, day);
});

/**
 * Schéma de validation pour les paramètres de requête GET /api/planning
 */
export const getPlanningQuerySchema = z.object({
  startDate: dateStringToLocal.optional(),
  endDate: dateStringToLocal.optional(),
});

export type GetPlanningQuery = z.infer<typeof getPlanningQuerySchema>;

/**
 * Schéma de validation pour le paramètre date de GET /api/planning/rdvs/me
 */
export const getRdvsMeQuerySchema = z.object({
  date: dateStringToLocal,
});

export type GetRdvsMeQuery = z.infer<typeof getRdvsMeQuerySchema>;

