import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface BookingSite {
  id: number;
  nom: string;
  ville: string;
  /** Distance (km) depuis l'adresse du patient ; null si inconnue. */
  distanceKm?: number | null;
}

export interface BookingMedecin {
  id: number;
  nom: string;
  prenom: string;
}

export interface BookingSitesResponse {
  medecin: BookingMedecin | null;
  sites: BookingSite[];
}

/** Type de RDV = modalité + durée (minutes). */
export interface BookingType {
  modalite: string;
  dureeMinutes: number;
}

export interface Slot {
  heureDebut: string; // "HH:mm"
  heureFin: string; // "HH:mm"
}

export interface Booking {
  id: number;
  date: string;
  heureDebut: string;
  heureFin: string;
  modalite: string;
  motif: string | null;
  site: { id: number; nom: string; ville: string } | null;
  medecin: { id: number; nom: string; prenom: string } | null;
}

export interface CreateBookingRequest {
  siteId: number;
  date: string; // YYYY-MM-DD
  heureDebut: string; // HH:mm
  modalite: string;
  motif?: string;
}

/**
 * Réservations patient : types, lieux, dates et créneaux disponibles, création, liste.
 */
@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getTypes(): Observable<{ types: BookingType[] }> {
    return this.http.get<{ types: BookingType[] }>(`${this.baseUrl}/rdv/types`);
  }

  getBookingSites(): Observable<BookingSitesResponse> {
    return this.http.get<BookingSitesResponse>(`${this.baseUrl}/rdv/booking-sites`);
  }

  getAvailableDates(
    siteId: number,
    modalite: string,
    year: number,
    month: number
  ): Observable<{ dates: string[] }> {
    const params = new HttpParams()
      .set('siteId', siteId)
      .set('modalite', modalite)
      .set('year', year)
      .set('month', month);
    return this.http.get<{ dates: string[] }>(`${this.baseUrl}/rdv/available-dates`, { params });
  }

  getAvailableSlots(siteId: number, modalite: string, date: string): Observable<{ slots: Slot[] }> {
    const params = new HttpParams().set('siteId', siteId).set('modalite', modalite).set('date', date);
    return this.http.get<{ slots: Slot[] }>(`${this.baseUrl}/rdv/available-slots`, { params });
  }

  getMyBookings(): Observable<{ rdvs: Booking[]; count: number }> {
    return this.http.get<{ rdvs: Booking[]; count: number }>(`${this.baseUrl}/rdv/me`);
  }

  createBooking(data: CreateBookingRequest): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/rdv`, data);
  }

  cancelBooking(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/rdv/${id}`);
  }
}
