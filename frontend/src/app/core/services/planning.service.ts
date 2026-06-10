import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { formatDateKey } from '../utils/date.utils';
import { environment } from '../../../environments/environment';

/**
 * Interface pour une vacation retournée par l'API
 */
export interface Vacation {
  id: number;
  date: string; // Format ISO: YYYY-MM-DD
  horaire: string; // Format ISO time
  site: string;
  ville: string;
  modalite: string;
}

/** État du dossier affiché sur le planning jour */
interface DossierPlanningStatus {
  hasObservations: boolean;
  fileCount: number;
  operationReady: boolean;
  verified: boolean;
}

/**
 * Interface pour un rendez-vous retourné par l'API
 */
export interface Rdv {
  id: number;
  date: string; // Format ISO: YYYY-MM-DD
  heureDebut: string; // Format ISO time
  heureFin: string; // Format ISO time
  modalite: string;
  dossierStatus: DossierPlanningStatus;
  patient: {
    id: number;
    nom: string;
    prenom: string;
  };
}

/**
 * Réponse de l'API pour GET /api/planning
 */
export interface PlanningResponse {
  vacations: Vacation[];
  count: number;
}

/**
 * Réponse de l'API pour GET /api/planning/rdvs
 */
export interface RdvsResponse {
  rdvs: Rdv[];
  count: number;
}

/**
 * Service pour gérer les appels API liés au planning
 */
@Injectable({
  providedIn: 'root',
})
export class PlanningService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Récupère les vacations pour une date précise
   */
  getVacationsForDate(date: Date): Observable<PlanningResponse> {
    const dateStr = this.formatDate(date);

    let params = new HttpParams();
    params = params.set('startDate', dateStr).set('endDate', dateStr);

    return this.http.get<PlanningResponse>(`${this.baseUrl}/planning`, { params });
  }

  /**
   * Récupère les vacations pour un mois donné
   */
  getVacationsForMonth(year: number, month: number): Observable<PlanningResponse> {
    const startDate = this.formatDate(new Date(year, month, 1));
    const endDate = this.formatDate(new Date(year, month + 1, 0));
    
    let params = new HttpParams();
    params = params.set('startDate', startDate).set('endDate', endDate);

    return this.http.get<PlanningResponse>(`${this.baseUrl}/planning`, { params });
  }

  /**
   * Récupère les rendez-vous pour un mois donné
   */
  getRdvsForMonth(year: number, month: number): Observable<RdvsResponse> {
    const startDate = this.formatDate(new Date(year, month, 1));
    const endDate = this.formatDate(new Date(year, month + 1, 0));
    
    let params = new HttpParams();
    params = params.set('startDate', startDate).set('endDate', endDate);

    return this.http.get<RdvsResponse>(`${this.baseUrl}/planning/rdvs`, { params });
  }

  /**
   * Récupère les rendez-vous du médecin connecté pour une date spécifique
   */
  getMyRdvsForDate(date: Date): Observable<RdvsResponse> {
    const dateStr = this.formatDate(date);
    
    let params = new HttpParams();
    params = params.set('date', dateStr);

    return this.http.get<RdvsResponse>(`${this.baseUrl}/planning/rdvs/me`, { params });
  }

  private formatDate(date: Date): string {
    return formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
  }
}

