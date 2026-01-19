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
 * Interface pour un rendez-vous retourné par l'API
 */
export interface Rdv {
  id: number;
  date: string; // Format ISO: YYYY-MM-DD
  heureDebut: string; // Format ISO time
  heureFin: string; // Format ISO time
  modalite: string;
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
   * Récupère les rendez-vous pour une date spécifique
   */
  getRdvsForDate(date: Date): Observable<RdvsResponse> {
    const dateStr = this.formatDate(date);
    
    let params = new HttpParams();
    params = params.set('startDate', dateStr).set('endDate', dateStr);

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
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * Formate une heure au format "HHhmm" depuis une string ISO time ou Date
   */
  formatTime(timeString: string | Date): string {
    let hours: number;
    let minutes: number;
    
    if (typeof timeString === 'string') {
      // Si c'est une string, essayer de la parser
      // Format possible: "HH:mm:ss", "HH:mm", ou ISO complet "2000-01-01T08:30:00.000Z"
      
      // Essayer d'abord le format time simple (HH:mm:ss ou HH:mm)
      const timeMatch = timeString.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
      } else {
        // Sinon, essayer de parser comme Date ISO
        const date = new Date(timeString);
        if (isNaN(date.getTime())) {
          console.error('Invalid time format:', timeString);
          return '00h00';
        }
        hours = date.getHours();
        minutes = date.getMinutes();
      }
    } else {
      // C'est déjà un objet Date
      if (isNaN(timeString.getTime())) {
        console.error('Invalid Date object:', timeString);
        return '00h00';
      }
      hours = timeString.getHours();
      minutes = timeString.getMinutes();
    }

    return `${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`;
  }
}

