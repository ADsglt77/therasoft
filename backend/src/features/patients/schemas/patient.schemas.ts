import { z } from 'zod';

/**
 * Schéma de validation pour les paramètres de route patient/rdv
 */
const numericParam = z.string().regex(/^\d+$/).transform((val) => parseInt(val, 10));

export const patientRdvParamsSchema = z.object({
  patientId: numericParam,
  rdvId: numericParam,
});

export type PatientRdvParams = z.infer<typeof patientRdvParamsSchema>;

/**
 * Paramètres de route incluant l'identifiant de fichier (routes /files/:fileId).
 */
export const patientRdvFileParamsSchema = patientRdvParamsSchema.extend({
  fileId: numericParam,
});

export type PatientRdvFileParams = z.infer<typeof patientRdvFileParamsSchema>;

