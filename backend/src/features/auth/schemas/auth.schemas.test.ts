import { Sexe } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  updateAvatarSchema,
  updateMedecinProfileSchema,
  updatePatientProfileSchema,
} from './auth.schemas';

describe('updatePatientProfileSchema', () => {
  it('valide et transforme la date de naissance et le sexe', () => {
    const result = updatePatientProfileSchema.parse({
      dateNaissance: '1990-05-14',
      sexe: Sexe.F,
      adresse: '1 rue de la Paix, Paris',
    });

    expect(result.dateNaissance).toEqual(new Date('1990-05-14T00:00:00.000Z'));
    expect(result.sexe).toBe(Sexe.F);
    expect(result.adresse).toBe('1 rue de la Paix, Paris');
  });

  it('refuse une date de naissance impossible', () => {
    expect(() => updatePatientProfileSchema.parse({ dateNaissance: '1990-02-31' })).toThrow();
  });

  it('refuse une date de naissance future', () => {
    expect(() => updatePatientProfileSchema.parse({ dateNaissance: '2999-01-01' })).toThrow();
  });

  it('refuse une valeur de sexe inconnue', () => {
    expect(() => updatePatientProfileSchema.parse({ sexe: 'INVALID' })).toThrow();
  });

  it('refuse les coordonnées fournies par le client', () => {
    expect(() =>
      updatePatientProfileSchema.parse({ latitude: 45.8336, longitude: 1.2611 })
    ).toThrow();
  });

  it('refuse les champs patient sur le profil medecin', () => {
    expect(() => updateMedecinProfileSchema.parse({ nom: 'Martin', medecinId: 2 })).toThrow();
  });
});

describe('updateAvatarSchema', () => {
  it('accepte les formats image autorises', () => {
    expect(updateAvatarSchema.parse({ avatarUrl: 'data:image/png;base64,aGVsbG8=' })).toBeTruthy();
  });

  it('refuse une data URL HTML', () => {
    expect(() =>
      updateAvatarSchema.parse({ avatarUrl: 'data:text/html;base64,PGgxPng8L2gxPg==' })
    ).toThrow();
  });
});
