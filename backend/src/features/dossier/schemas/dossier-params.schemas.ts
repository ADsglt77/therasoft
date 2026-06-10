import { z } from 'zod';

const numericParam = z
  .string()
  .regex(/^\d+$/)
  .transform((val) => parseInt(val, 10));

export const patientRdvParamsSchema = z.object({
  patientId: numericParam,
  rdvId: numericParam,
});

export type PatientRdvParams = z.infer<typeof patientRdvParamsSchema>;

export const patientRdvFileParamsSchema = patientRdvParamsSchema.extend({
  fileId: numericParam,
});

export type PatientRdvFileParams = z.infer<typeof patientRdvFileParamsSchema>;
