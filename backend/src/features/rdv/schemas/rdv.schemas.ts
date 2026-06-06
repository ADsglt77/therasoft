import { z } from 'zod';
import { ModaliteType } from '@prisma/client';

/** Date YYYY-MM-DD → Date UTC minuit (cohérent avec le stockage @db.Date du seed). */
const dateStringToUtc = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide. Utilisez YYYY-MM-DD')
  .transform((val) => {
    const [year, month, day] = val.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  });

const timeString = z.string().regex(/^\d{2}:\d{2}$/, "Format d'heure invalide (HH:mm)");

/** Réservation patient : lieu + date + créneau + modalité (la durée en découle). */
export const createBookingSchema = z.object({
  siteId: z.coerce.number().int().positive('Veuillez choisir un lieu'),
  date: dateStringToUtc,
  heureDebut: timeString,
  modalite: z.nativeEnum(ModaliteType),
  motif: z.string().max(200).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const availableDatesQuerySchema = z.object({
  siteId: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export type AvailableDatesQuery = z.infer<typeof availableDatesQuerySchema>;

export const availableSlotsQuerySchema = z.object({
  siteId: z.coerce.number().int().positive(),
  modalite: z.nativeEnum(ModaliteType),
  date: dateStringToUtc,
});

export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>;

export const rdvIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type RdvIdParams = z.infer<typeof rdvIdParamsSchema>;
