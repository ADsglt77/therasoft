import { describe, expect, it } from 'vitest';
import { availableSlotsQuerySchema, createBookingSchema } from './rdv.schemas';

describe('rdv schemas', () => {
  it('refuse les dates impossibles', () => {
    expect(() =>
      availableSlotsQuerySchema.parse({
        siteId: 1,
        modalite: 'MRI',
        date: '2026-02-31',
      })
    ).toThrow();
  });

  it('refuse les heures hors plage', () => {
    expect(() =>
      createBookingSchema.parse({
        siteId: 1,
        modalite: 'MRI',
        date: '2999-01-01',
        heureDebut: '25:90',
      })
    ).toThrow();
  });

  it('transforme une date valide en UTC', () => {
    const result = availableSlotsQuerySchema.parse({
      siteId: 1,
      modalite: 'MRI',
      date: '2026-06-12',
    });
    expect(result.date).toEqual(new Date('2026-06-12T00:00:00.000Z'));
  });
});
