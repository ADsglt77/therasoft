import { Site } from '../services/site.service';

/**
 * Helpers Google Maps « simples » (sans clé API) : on localise les sites
 * par leur nom + adresse/ville, qui correspondent à de vrais établissements.
 */

/** Construit la requête de localisation (nom + adresse|ville). */
export function siteQuery(site: Pick<Site, 'nom' | 'ville' | 'adresse'>): string {
  return [site.nom, site.adresse, site.ville].filter(Boolean).join(', ');
}

/** URL d'iframe Google Maps embarquée (sans clé API). */
export function mapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
}

/** Lien « itinéraire » Google Maps (ouvre l'app/onglet de navigation). */
export function mapsDirectionsUrl(query: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

/** Lien « fiche lieu » Google Maps (plus d'infos sur l'établissement). */
export function mapsPlaceUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
