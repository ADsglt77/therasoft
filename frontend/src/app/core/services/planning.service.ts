import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../api/api-client.service';
import { HttpClient, HttpParams } from '@angular/common/http';

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

/**
 * Réponse de l'API pour GET /api/planning
 */
export interface PlanningResponse {
  vacations: Vacation[];
  count: number;
}

/**
 * Service pour gérer les appels API liés au planning
 */
@Injectable({
  providedIn: 'root',
})
export class PlanningService extends ApiClientService {
  constructor(http: HttpClient) {
    super(http);
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

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

