import { z } from 'zod';

/**
 * Schéma de validation pour GET /api/sites.
 * `q` : recherche optionnelle (nom de site, ville, ou nom de patient).
 */
export const getSitesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
});

export type GetSitesQuery = z.infer<typeof getSitesQuerySchema>;
