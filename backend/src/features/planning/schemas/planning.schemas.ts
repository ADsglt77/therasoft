import { z } from 'zod';

/**
 * Schéma de validation pour les paramètres de requête GET /api/planning
 */
export const getPlanningQuerySchema = z.object({
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

export type GetPlanningQuery = z.infer<typeof getPlanningQuerySchema>;

