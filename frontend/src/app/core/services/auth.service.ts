import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject, shareReplay, catchError, finalize, of } from 'rxjs';
import { ApiClientService } from '../../api/api-client.service';
import { TokenStorageService } from './token-storage.service';
import { Router } from '@angular/router';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PatientRegisterRequest {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  medecinId: number;
}

export interface MedecinOption {
  id: number;
  nom: string;
  prenom: string;
  specialite?: string | null;
}

/** Utilisateur connecté (médecin/secrétaire ou patient). */
export interface AuthUser {
  id: number;
  nom: string;
  prenom: string;
  role: string;
  email?: string;
  avatarUrl?: string | null;
  avatarFileName?: string | null;
  medecin?: MedecinOption | null;
}

/** Alias historique conservé pour les composants existants. */
export type MeResponse = AuthUser;

export interface AuthResponse {
  accessToken: string;
  role: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService extends ApiClientService {
  constructor(
    http: HttpClient,
    private tokenStorage: TokenStorageService,
    private router: Router
  ) {
    super(http);
  }

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable().pipe(shareReplay(1));

  private setCurrentUser(user: AuthUser | null): void {
    this.currentUserSubject.next(user);
  }

  getCurrentUser(): Observable<AuthUser | null> {
    return this.currentUser$;
  }

  /** Connexion unifiée (médecin ou patient) ; le backend renvoie le rôle. */
  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, data, { withCredentials: true })
      .pipe(tap((res) => this.applyAuth(res)));
  }

  /** Auto-inscription patient (+ médecin choisi) : connecte directement. */
  registerPatient(data: PatientRegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/patient/register`, data, { withCredentials: true })
      .pipe(tap((res) => this.applyAuth(res)));
  }

  /** Liste des médecins (pour le select d'inscription patient). */
  getMedecins(): Observable<{ medecins: MedecinOption[] }> {
    return this.http.get<{ medecins: MedecinOption[] }>(`${this.baseUrl}/auth/medecins`);
  }

  private applyAuth(res: AuthResponse): void {
    this.tokenStorage.setAccessToken(res.accessToken);
    this.tokenStorage.setRole(res.role);
    this.setCurrentUser(res.user);
  }

  refresh(): Observable<{ accessToken: string }> {
    return this.http
      .post<{ accessToken: string }>(`${this.baseUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(tap((response) => this.tokenStorage.setAccessToken(response.accessToken)));
  }

  /** Supprime le token et l'état utilisateur côté client (sans appel API). */
  clearSession(): void {
    this.tokenStorage.clear();
    this.setCurrentUser(null);
  }

  /** Déconnexion : nettoie toujours la session locale, même si l'API échoue. */
  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        catchError(() => of(undefined)),
        finalize(() => {
          this.clearSession();
          void this.router.navigate(['/login']);
        })
      );
  }

  /** Récupère l'utilisateur connecté selon son rôle. */
  getMe(): Observable<AuthUser> {
    const url = this.isPatient() ? `${this.baseUrl}/auth/patient/me` : `${this.baseUrl}/auth/me`;
    return this.http.get<AuthUser>(url).pipe(tap((user) => this.setCurrentUser(user)));
  }

  updateProfile(data: { nom?: string; prenom?: string }): Observable<AuthUser> {
    const url = this.isPatient() ? `${this.baseUrl}/auth/patient/me` : `${this.baseUrl}/auth/me`;
    return this.http.patch<AuthUser>(url, data).pipe(tap((updatedUser) => this.setCurrentUser(updatedUser)));
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<{ message: string }> {
    const url = this.isPatient() ? `${this.baseUrl}/auth/patient/password` : `${this.baseUrl}/auth/password`;
    return this.http.patch<{ message: string }>(url, data);
  }

  updateAvatar(data: { avatarUrl: string | null; avatarFileName?: string | null }): Observable<AuthUser> {
    return this.http
      .patch<AuthUser>(`${this.baseUrl}/auth/avatar`, data)
      .pipe(tap((updatedUser) => this.setCurrentUser(updatedUser)));
  }

  isAuthenticated(): boolean {
    return !!this.tokenStorage.getAccessToken();
  }

  getAccessToken(): string | null {
    return this.tokenStorage.getAccessToken();
  }

  getRole(): string | null {
    return this.tokenStorage.getRole();
  }

  isPatient(): boolean {
    return this.getRole() === 'PATIENT';
  }
}
