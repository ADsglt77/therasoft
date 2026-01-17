import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject, shareReplay, catchError, throwError } from 'rxjs';
import { ApiClientService } from '../../api/api-client.service';
import { TokenStorageService } from './token-storage.service';
import { Router } from '@angular/router';

export interface RegisterRequest {
  email: string;
  password: string;
  nom: string;
  prenom: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  medecin: {
    id: number;
    email?: string;
    nom: string;
    prenom: string;
    role: string;
  };
}

export interface MeResponse {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  avatarUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService extends ApiClientService {
  constructor(
    http: HttpClient,
    tokenStorage: TokenStorageService,
    private router: Router
  ) {
    super(http);
    this.tokenStorage = tokenStorage;
  }

  private tokenStorage: TokenStorageService;
  
  /**
   * BehaviorSubject pour stocker l'utilisateur actuel
   * Permet de partager les informations utilisateur entre les composants
   */
  private currentUserSubject = new BehaviorSubject<MeResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable().pipe(shareReplay(1));

  /**
   * Met à jour l'utilisateur actuel dans le BehaviorSubject
   */
  private setCurrentUser(user: MeResponse | null): void {
    this.currentUserSubject.next(user);
  }

  /**
   * Récupère l'utilisateur actuel (Observable)
   * S'abonner à cette méthode pour recevoir les mises à jour en temps réel
   */
  getCurrentUser(): Observable<MeResponse | null> {
    return this.currentUser$;
  }

  /**
   * Inscription d'un nouveau médecin
   */
  register(data: RegisterRequest): Observable<{ message: string; medecin: MeResponse }> {
    return this.http.post<{ message: string; medecin: MeResponse }>(
      `${this.baseUrl}/auth/register`,
      data
    );
  }

  /**
   * Connexion d'un médecin
   */
  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, data, {
        withCredentials: true, // Important pour recevoir les cookies httpOnly
      })
      .pipe(
        tap((response) => {
          // Sauvegarder l'access token
          this.tokenStorage.setAccessToken(response.accessToken);
          // Mettre à jour l'utilisateur actuel
          if (response.medecin) {
            this.setCurrentUser({
              id: response.medecin.id,
              email: response.medecin.email || '',
              nom: response.medecin.nom,
              prenom: response.medecin.prenom,
              role: response.medecin.role,
            });
          }
        })
      );
  }

  /**
   * Rafraîchir l'access token
   */
  refresh(): Observable<{ accessToken: string }> {
    return this.http
      .post<{ accessToken: string }>(
        `${this.baseUrl}/auth/refresh`,
        {},
        {
          withCredentials: true, // Envoie les cookies
        }
      )
      .pipe(
        tap((response) => {
          this.tokenStorage.setAccessToken(response.accessToken);
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Déconnexion
   */
  logout(): Observable<void> {
    return this.http
      .post<void>(
        `${this.baseUrl}/auth/logout`,
        {},
        {
          withCredentials: true,
        }
      )
      .pipe(
        tap(() => {
          this.tokenStorage.clear();
          this.setCurrentUser(null); // Réinitialiser l'utilisateur actuel
          this.router.navigate(['/']);
        })
      );
  }

  /**
   * Récupère les informations du médecin connecté
   */
  getMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.baseUrl}/auth/me`).pipe(
      tap((user) => {
        // Mettre à jour l'utilisateur actuel après récupération
        this.setCurrentUser(user);
      })
    );
  }

  /**
   * Modifie le profil du médecin connecté
   */
  updateProfile(data: { nom?: string; prenom?: string }): Observable<MeResponse> {
    return this.http.patch<MeResponse>(`${this.baseUrl}/auth/me`, data).pipe(
      tap((updatedUser) => {
        // Mettre à jour l'utilisateur actuel après modification
        this.setCurrentUser(updatedUser);
      })
    );
  }

  /**
   * Change le mot de passe du médecin connecté
   */
  changePassword(data: { currentPassword: string; newPassword: string }): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.baseUrl}/auth/password`, data);
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    return !!this.tokenStorage.getAccessToken();
  }

  /**
   * Récupère le token d'accès
   */
  getAccessToken(): string | null {
    return this.tokenStorage.getAccessToken();
  }
}

