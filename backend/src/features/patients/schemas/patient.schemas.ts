import { z } from 'zod';

/**
 * Schéma de validation pour les paramètres de route patient/rdv
 */
export const patientRdvParamsSchema = z.object({
  patientId: z.string().regex(/^\d+$/).transform((val) => parseInt(val, 10)),
  rdvId: z.string().regex(/^\d+$/).transform((val) => parseInt(val, 10)),
});

export type PatientRdvParams = z.infer<typeof patientRdvParamsSchema>;

