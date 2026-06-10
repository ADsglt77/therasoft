import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { extractApiError, isNetworkError } from './errors';

describe('API errors', () => {
  it('conserve le message d une erreur metier locale', () => {
    expect(extractApiError(new Error('Connexion refusee')).message).toBe('Connexion refusee');
  });

  it('extrait le contrat d erreur de l API', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: {
        error: {
          code: 'BOOKING_SLOT_UNAVAILABLE',
          message: 'Ce creneau est indisponible',
          details: null,
        },
        requestId: 'request-123',
      },
    });

    expect(extractApiError(error)).toEqual({
      code: 'BOOKING_SLOT_UNAVAILABLE',
      message: 'Ce creneau est indisponible',
      details: null,
      requestId: 'request-123',
    });
  });

  it('identifie uniquement les vraies erreurs reseau ou serveur', () => {
    expect(isNetworkError(new Error('Erreur metier'))).toBe(false);
    expect(isNetworkError(new HttpErrorResponse({ status: 503 }))).toBe(true);
  });
});
