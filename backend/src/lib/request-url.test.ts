import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { emailBaseUrl } from './request-url';

// En test, FRONTEND_ORIGIN = http://localhost (setup) → toute origine valide est acceptée.
function req(origin?: string): Request {
  return {
    get: (h: string) => (h.toLowerCase() === 'origin' ? origin : undefined),
  } as unknown as Request;
}

describe('emailBaseUrl', () => {
  it("utilise l'origine de la requête (domaine du navigateur)", () => {
    expect(emailBaseUrl(req('https://mon-domaine.fr'))).toBe('https://mon-domaine.fr');
    expect(emailBaseUrl(req('http://localhost'))).toBe('http://localhost');
  });

  it('retire le slash final', () => {
    expect(emailBaseUrl(req('https://mon-domaine.fr/'))).toBe('https://mon-domaine.fr');
  });

  it("repli sur la configuration quand l'origine est absente ou invalide", () => {
    expect(emailBaseUrl(req(undefined))).toBe('http://localhost');
    expect(emailBaseUrl(req('pas-une-url'))).toBe('http://localhost');
  });
});
