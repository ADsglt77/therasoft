import { ApiError } from '../../../middlewares/errorHandler';
import { z } from 'zod';

/**
 * Géocodage via l'API Adresse du gouvernement français (api-adresse.data.gouv.fr).
 * Gratuit, sans clé, optimisé pour les adresses françaises : autocomplétion,
 * normalisation et coordonnées GPS. Sert à vérifier l'adresse d'un patient et
 * à calculer les distances aux lieux de rendez-vous.
 */
interface AddressSuggestion {
  label: string;
  latitude: number;
  longitude: number;
  city: string | null;
  postcode: string | null;
}

const banFeatureSchema = z.object({
  geometry: z.object({
    coordinates: z.tuple([
      z.number().finite().min(-180).max(180),
      z.number().finite().min(-90).max(90),
    ]),
  }),
  properties: z.object({
    label: z.string().trim().min(1),
    city: z.string().nullable().optional(),
    postcode: z.string().nullable().optional(),
  }),
});

const banResponseSchema = z.object({
  features: z.array(banFeatureSchema).default([]),
});

type BanFeature = z.infer<typeof banFeatureSchema>;

const BASE_URL = 'https://api-adresse.data.gouv.fr/search/';
const MIN_QUERY = 3;

function toSuggestion(feature: BanFeature): AddressSuggestion {
  const [longitude, latitude] = feature.geometry.coordinates;
  return {
    label: feature.properties.label,
    latitude,
    longitude,
    city: feature.properties.city ?? null,
    postcode: feature.properties.postcode ?? null,
  };
}

class AddressService {
  /** Suggestions d'adresses pour l'autocomplétion (silencieux en cas d'indisponibilité). */
  async search(query: string, limit = 5): Promise<AddressSuggestion[]> {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      return [];
    }
    try {
      const features = await this.fetchFeatures(
        `${BASE_URL}?q=${encodeURIComponent(q)}&limit=${limit}&autocomplete=1`
      );
      return features.map(toSuggestion);
    } catch {
      return [];
    }
  }

  /** Géocode une adresse et renvoie la meilleure correspondance, ou null si introuvable. */
  async geocode(query: string): Promise<AddressSuggestion | null> {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      return null;
    }
    const features = await this.fetchFeatures(`${BASE_URL}?q=${encodeURIComponent(q)}&limit=1`);
    return features.length ? toSuggestion(features[0]) : null;
  }

  private async fetchFeatures(url: string): Promise<BanFeature[]> {
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    } catch {
      throw new ApiError(
        "Service d'adresse temporairement indisponible",
        'ADDRESS_SERVICE_UNAVAILABLE',
        503
      );
    }
    if (!response.ok) {
      throw new ApiError(
        "Service d'adresse temporairement indisponible",
        'ADDRESS_SERVICE_UNAVAILABLE',
        503
      );
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError(
        "Réponse invalide du service d'adresse",
        'ADDRESS_SERVICE_INVALID_RESPONSE',
        503
      );
    }
    const parsed = banResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "Réponse invalide du service d'adresse",
        'ADDRESS_SERVICE_INVALID_RESPONSE',
        503
      );
    }
    return parsed.data.features;
  }
}

export const addressService = new AddressService();
