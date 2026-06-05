import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ApiClientService } from '../../api/api-client.service';

/** Créneau d'ouverture (jour 1 = lundi … 7 = dimanche). */
export interface OpeningHour {
  day: number;
  open: string; // "HH:mm"
  close: string; // "HH:mm"
}

/**
 * Site (établissement) retourné par GET /api/sites, avec stats agrégées
 * pour le médecin connecté.
 */
export interface Site {
  id: number;
  nom: string;
  ville: string;
  adresse: string | null;
  latitude: number | null;
  longitude: number | null;
  websiteUrl: string | null;
  openingHours: OpeningHour[];
  vacationCount: number;
  modalites: string[];
  nextVacationDate: string | null; // YYYY-MM-DD
  rdvCount: number;
  rdvUpcomingCount: number;
}

export interface SitesResponse {
  sites: Site[];
  count: number;
}

/**
 * Service pour les appels API liés aux sites.
 */
@Injectable({
  providedIn: 'root',
})
export class SiteService extends ApiClientService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Récupère les sites du médecin connecté avec leurs statistiques. */
  getSites(): Observable<SitesResponse> {
    return this.http.get<SitesResponse>(`${this.baseUrl}/sites`);
  }
}
