import { ModaliteType } from '@prisma/client';
import { z } from 'zod';
import {
  dateKeySchema,
  dateStringToUtcSchema,
  parisDateKey,
  timeStringSchema,
} from '../../../lib/dates';

const bookableDateSchema = dateKeySchema
  .refine((value) => value >= parisDateKey(), 'La date du rendez-vous est passee')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const createBookingSchema = z.object({
  siteId: z.coerce.number().int().positive('Veuillez choisir un lieu'),
  date: bookableDateSchema,
  heureDebut: timeStringSchema,
  modalite: z.nativeEnum(ModaliteType),
  motif: z.string().trim().max(200).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const availableDatesQuerySchema = z.object({
  siteId: z.coerce.number().int().positive(),
  modalite: z.nativeEnum(ModaliteType),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export type AvailableDatesQuery = z.infer<typeof availableDatesQuerySchema>;

export const availableSlotsQuerySchema = z.object({
  siteId: z.coerce.number().int().positive(),
  modalite: z.nativeEnum(ModaliteType),
  date: dateStringToUtcSchema,
});

export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>;

export const rdvIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type RdvIdParams = z.infer<typeof rdvIdParamsSchema>;
