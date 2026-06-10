import { z } from 'zod';
import { dateStringToUtcSchema } from '../../../lib/dates';

export const getPlanningQuerySchema = z
  .object({
    startDate: dateStringToUtcSchema.optional(),
    endDate: dateStringToUtcSchema.optional(),
  })
  .refine(({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate, {
    message: 'La date de debut doit preceder la date de fin',
    path: ['endDate'],
  });

export type GetPlanningQuery = z.infer<typeof getPlanningQuerySchema>;

export const getRdvsMeQuerySchema = z.object({
  date: dateStringToUtcSchema,
});

export type GetRdvsMeQuery = z.infer<typeof getRdvsMeQuerySchema>;
