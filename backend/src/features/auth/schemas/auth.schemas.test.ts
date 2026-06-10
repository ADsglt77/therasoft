import { describe, expect, it } from 'vitest';
import { Sexe } from '@prisma/client';
import { updateProfileSchema } from './auth.schemas';

describe('updateProfileSchema', () => {
  it('valide et transforme la date de naissance et le sexe', () => {
    const result = updateProfileSchema.parse({
      dateNaissance: '1990-05-14',
      sexe: Sexe.F,
      latitude: 45.8336,
      longitude: 1.2611,
    });

    expect(result.dateNaissance).toEqual(new Date('1990-05-14T00:00:00.000Z'));
    expect(result.sexe).toBe(Sexe.F);
    expect(result.latitude).toBe(45.8336);
    expect(result.longitude).toBe(1.2611);
  });

  it('refuse une date de naissance impossible', () => {
    expect(() => updateProfileSchema.parse({ dateNaissance: '1990-02-31' })).toThrow();
  });

  it('refuse une date de naissance future', () => {
    expect(() => updateProfileSchema.parse({ dateNaissance: '2999-01-01' })).toThrow();
  });

  it('refuse une valeur de sexe inconnue', () => {
    expect(() => updateProfileSchema.parse({ sexe: 'INVALID' })).toThrow();
  });

  it('refuse des coordonnées hors limites', () => {
    expect(() => updateProfileSchema.parse({ latitude: 91, longitude: 181 })).toThrow();
  });

  it('refuse des coordonnées incomplètes', () => {
    expect(() => updateProfileSchema.parse({ latitude: 45.8336 })).toThrow();
  });
});
