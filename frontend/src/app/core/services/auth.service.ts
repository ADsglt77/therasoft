import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, BehaviorSubject, shareReplay, catchError, finalize, of, map, from, switchMap } from 'rxjs';
import { ApiClientService } from '../../api/api-client.service';
import { RoleStorageService } from './role-storage.service';
import { Router } from '@angular/router';
import { authClient } from './auth.client';

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
  adresse: string;
}

export interface AddressSuggestion {
  label: string;
  latitude: number;
  longitude: number;
  city: string | null;
  postcode: string | null;
}

export interface MedecinOption {
  id: number;
  nom: string;
  prenom: string;
  specialite?: string | null;
}

export interface AuthUser {
  id: number;
  nom: string;
  prenom: string;
  role: string;
  email?: string;
  avatarUrl?: string | null;
  avatarFileName?: string | null;
  adresse?: string | null;
  emailVerified?: boolean;
  medecin?: MedecinOption | null;
}

export type MeResponse = AuthUser;

export interface AuthResponse {
  role: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService extends ApiClientService {
  constructor(
    http: HttpClient,
    private roleStorage: RoleStorageService,
    private router: Router
  ) {
    super(http);
  }

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable().pipe(shareReplay(1));

  /** Requête de restauration de session en cours (partagée entre guards concurrents). */
  private restoreRequest$?: Observable<AuthUser | null>;

  private setCurrentUser(user: AuthUser | null): void {
    this.currentUserSubject.next(user);
    if (user) {
      this.roleStorage.setRole(user.role);
    }
  }

  getCurrentUser(): Observable<AuthUser | null> {
    return this.currentUser$;
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return from(authClient.signIn.email({ email: data.email, password: data.password })).pipe(
      switchMap((res) => {
        if (res.error) throw new Error(res.error.message || 'Erreur de connexion');
        return this.getMe();
      }),
      map((user) => this.applyAuth(user))
    );
  }

  registerPatient(data: PatientRegisterRequest): Observable<AuthResponse> {
    return from(
      authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: `${data.nom} ${data.prenom}`.trim(),
      })
    ).pipe(
      switchMap((res) => {
        if (res.error) throw new Error(res.error.message || "Erreur d'inscription");
        // Complète le profil patient (adresse + médecin choisi) créé par Better Auth.
        this.roleStorage.setRole('PATIENT');
        return this.http.patch<AuthUser>(`${this.baseUrl}/auth/patient/me`, {
          nom: data.nom,
          prenom: data.prenom,
          adresse: data.adresse,
          medecinId: data.medecinId,
        });
      }),
      map((user) => this.applyAuth(user))
    );
  }

  getMedecins(): Observable<{ medecins: MedecinOption[] }> {
    return this.http.get<{ medecins: MedecinOption[] }>(`${this.baseUrl}/auth/medecins`);
  }

  searchAddresses(query: string): Observable<AddressSuggestion[]> {
    const params = new HttpParams().set('q', query);
    return this.http
      .get<{ suggestions: AddressSuggestion[] }>(`${this.baseUrl}/auth/address/search`, { params })
      .pipe(map((res) => res.suggestions));
  }

  private applyAuth(user: AuthUser): AuthResponse {
    this.setCurrentUser(user);
    return { role: user.role, user };
  }

  clearSession(): void {
    this.roleStorage.clear();
    this.setCurrentUser(null);
  }

  logout(): Observable<void> {
    return from(authClient.signOut()).pipe(
      catchError(() => of(undefined)),
      finalize(() => {
        this.clearSession();
        void this.router.navigate(['/login']);
      }),
      map(() => void 0)
    );
  }

  /**
   * Charge le profil de l'utilisateur connecté. L'endpoint dépend du rôle ;
   * si le rôle n'est pas connu localement (rechargement, storage vidé), on le
   * récupère depuis la session Better Auth.
   */
  getMe(): Observable<AuthUser> {
    const role = this.roleStorage.getRole();
    if (role) {
      return this.fetchProfile(role === 'PATIENT');
    }
    return from(authClient.getSession()).pipe(
      switchMap((session) => {
        const sessionRole = (session.data?.user as { role?: string } | undefined)?.role ?? 'PATIENT';
        this.roleStorage.setRole(sessionRole);
        return this.fetchProfile(sessionRole === 'PATIENT');
      })
    );
  }

  private fetchProfile(isPatient: boolean): Observable<AuthUser> {
    const url = isPatient ? `${this.baseUrl}/auth/patient/me` : `${this.baseUrl}/auth/me`;
    return this.http.get<AuthUser>(url).pipe(tap((user) => this.setCurrentUser(user)));
  }

  /**
   * Restaure l'utilisateur courant à partir de la session Better Auth (cookie) :
   * source de vérité pour les guards. Renvoie l'utilisateur, ou `null` si non
   * authentifié. Les appels concurrents partagent la même requête réseau.
   */
  restoreSession(): Observable<AuthUser | null> {
    const current = this.currentUserSubject.value;
    if (current) {
      return of(current);
    }
    if (!this.restoreRequest$) {
      this.restoreRequest$ = from(authClient.getSession()).pipe(
        switchMap((session) => {
          const sessionUser = session.data?.user;
          if (!sessionUser) {
            this.clearSession();
            return of(null);
          }
          const role = (sessionUser as { role?: string }).role ?? 'PATIENT';
          this.roleStorage.setRole(role);
          return this.fetchProfile(role === 'PATIENT').pipe(
            map((user) => user as AuthUser | null),
            catchError(() => of(null))
          );
        }),
        catchError(() => of(null)),
        finalize(() => {
          this.restoreRequest$ = undefined;
        }),
        shareReplay(1)
      );
    }
    return this.restoreRequest$;
  }

  updateProfile(data: { nom?: string; prenom?: string }): Observable<AuthUser> {
    const url = this.isPatient() ? `${this.baseUrl}/auth/patient/me` : `${this.baseUrl}/auth/me`;
    return this.http.patch<AuthUser>(url, data).pipe(tap((updatedUser) => this.setCurrentUser(updatedUser)));
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<{ message: string }> {
    return from(
      authClient.changePassword({
        newPassword: data.newPassword,
        currentPassword: data.currentPassword,
        revokeOtherSessions: true,
      })
    ).pipe(
      map((res) => {
        if (res.error) throw new Error(res.error.message || 'Erreur lors du changement de mot de passe');
        return { message: 'Mot de passe modifié avec succès' };
      })
    );
  }

  updateAvatar(data: { avatarUrl: string | null; avatarFileName?: string | null }): Observable<AuthUser> {
    return this.http
      .patch<AuthUser>(`${this.baseUrl}/auth/avatar`, data)
      .pipe(tap((updatedUser) => this.setCurrentUser(updatedUser)));
  }

  isAuthenticated(): boolean {
    return !!this.roleStorage.getRole();
  }

  getRole(): string | null {
    return this.roleStorage.getRole();
  }

  isPatient(): boolean {
    return this.getRole() === 'PATIENT';
  }

  verifyEmail(token: string): Observable<{ message: string }> {
    return from(authClient.verifyEmail({ query: { token } })).pipe(
      map((res) => {
        if (res.error) throw new Error(res.error.message);
        return { message: 'Adresse email vérifiée' };
      })
    );
  }

  resendVerification(): Observable<{ message: string }> {
    return from(authClient.getSession()).pipe(
      switchMap((session) => {
        if (!session.data?.user.email) throw new Error('Email introuvable');
        return from(
          authClient.sendVerificationEmail({
            email: session.data.user.email,
            callbackURL: `${window.location.origin}/verifier-email`,
          })
        );
      }),
      map((res) => {
        if (res.error) throw new Error(res.error.message);
        return { message: 'Email de vérification renvoyé' };
      })
    );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return from(
      authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
      })
    ).pipe(
      map((res) => {
        if (res.error) throw new Error(res.error.message);
        return { message: 'Si un compte existe pour cet email, un lien a été envoyé.' };
      })
    );
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return from(authClient.resetPassword({ newPassword, token })).pipe(
      map((res) => {
        if (res.error) throw new Error(res.error.message);
        return { message: 'Mot de passe réinitialisé' };
      })
    );
  }
}
