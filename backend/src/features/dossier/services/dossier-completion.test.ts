import { describe, expect, it } from 'vitest';
import { isDossierOperationReady, nextDossierOperationStatus } from './dossier-completion';

describe('isDossierOperationReady', () => {
  it('returns false when observations are empty', () => {
    expect(isDossierOperationReady(null, 2)).toBe(false);
    expect(isDossierOperationReady('   ', 1)).toBe(false);
  });

  it('returns false when there are no files', () => {
    expect(isDossierOperationReady('Observation complète', 0)).toBe(false);
  });

  it('returns true when observations and at least one file exist', () => {
    expect(isDossierOperationReady('Observation complète', 1)).toBe(true);
  });
});

describe('nextDossierOperationStatus', () => {
  const now = new Date('2026-06-10T12:00:00.000Z');

  it('initialise la date de préparation lorsque le dossier devient complet', () => {
    expect(nextDossierOperationStatus('Compte rendu', 1, null, false, now)).toEqual({
      operationReady: true,
      operationReadyAt: now,
      verified: false,
    });
  });

  it('retire automatiquement la vérification si le dossier redevient incomplet', () => {
    expect(
      nextDossierOperationStatus('Compte rendu', 0, new Date('2026-06-01'), true, now)
    ).toEqual({
      operationReady: false,
      operationReadyAt: null,
      verified: false,
    });
  });
});
