import { describe, expect, it } from 'vitest';
import { isDossierOperationReady } from './dossier-completion';

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
