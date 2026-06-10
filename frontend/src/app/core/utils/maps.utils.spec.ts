import { describe, it, expect } from 'vitest';
import { siteQuery, mapsEmbedUrl, mapsDirectionsUrl, mapsPlaceUrl } from './maps.utils';

describe('siteQuery', () => {
  it('utilise les coordonnées GPS si disponibles', () => {
    expect(
      siteQuery({ nom: 'Centre', ville: 'Lyon', adresse: '1 rue X', latitude: 45.76, longitude: 4.83 })
    ).toBe('45.76,4.83');
  });

  it('retombe sur nom + adresse + ville sans coordonnées', () => {
    expect(
      siteQuery({ nom: 'Centre', ville: 'Lyon', adresse: '1 rue X', latitude: null, longitude: null })
    ).toBe('Centre, 1 rue X, Lyon');
  });
});

describe('URLs Google Maps', () => {
  const q = 'Centre, Lyon';

  it('encode la requête dans les différentes URLs', () => {
    expect(mapsEmbedUrl(q)).toContain('output=embed');
    expect(mapsEmbedUrl(q)).toContain(encodeURIComponent(q));
    expect(mapsDirectionsUrl(q)).toContain('dir/?api=1&destination=');
    expect(mapsPlaceUrl(q)).toContain('search/?api=1&query=');
  });
});
