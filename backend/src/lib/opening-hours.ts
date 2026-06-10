import { z } from 'zod';
import { timeStringSchema } from './dates';

const openingHourSchema = z
  .object({
    day: z.number().int().min(1).max(7),
    open: timeStringSchema,
    close: timeStringSchema,
  })
  .strict()
  .refine(({ open, close }) => open < close, {
    message: "L'heure de fermeture doit suivre l'heure d'ouverture",
    path: ['close'],
  });

export type OpeningHour = z.infer<typeof openingHourSchema>;

export function parseOpeningHours(value: unknown): OpeningHour[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((candidate) => {
    const parsed = openingHourSchema.safeParse(candidate);
    return parsed.success ? [parsed.data] : [];
  });
}

export function openingHoursForDay(value: unknown, day: number): OpeningHour | null {
  return parseOpeningHours(value).find((hours) => hours.day === day) ?? null;
}
