import { afterEach, describe, expect, it, vi } from 'vitest';
import { addressService } from './address.service';

function mockResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('AddressService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('valide et convertit une réponse de la Base Adresse Nationale', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({
        features: [
          {
            geometry: { coordinates: [2.3522, 48.8566] },
            properties: {
              label: '10 Rue de Rivoli 75001 Paris',
              city: 'Paris',
              postcode: '75001',
            },
          },
        ],
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await addressService.geocode('10 rue de Rivoli Paris');

    expect(result).toEqual({
      label: '10 Rue de Rivoli 75001 Paris',
      latitude: 48.8566,
      longitude: 2.3522,
      city: 'Paris',
      postcode: '75001',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejette une réponse contenant des coordonnées invalides', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse({
          features: [
            {
              geometry: { coordinates: [500, 200] },
              properties: { label: 'Adresse invalide' },
            },
          ],
        })
      )
    );

    await expect(addressService.geocode('adresse invalide')).rejects.toMatchObject({
      code: 'ADDRESS_SERVICE_INVALID_RESPONSE',
      statusCode: 503,
    });
  });

  it('retourne silencieusement une liste vide si la recherche est indisponible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    await expect(addressService.search('rue de Paris')).resolves.toEqual([]);
  });
});
