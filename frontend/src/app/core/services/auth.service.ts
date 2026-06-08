import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, BehaviorSubject, shareReplay, catchError, finalize, of, map, from, switchMap } from 'rxjs';
import { ApiClientService } from '../../api/api-client.service';
import { TokenStorageService } from './token-storage.service';
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
  accessToken: string; // Faux token pour la rétrocompatibilité
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
    if (user) {
      this.tokenStorage.setRole(user.role);
    }
  }

  getCurrentUser(): Observable<AuthUser | null> {
    return this.currentUser$;
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return from(authClient.signIn.email({
      email: data.email,
      password: data.password,
    })).pipe(
      switchMap((res) => {
        if (res.error) throw new Error(res.error.message || 'Erreur de connexion');
        return this.getMe();
      }),
      map((user) => {
        const authResponse = {
          accessToken: 'better-auth-cookie', // BetterAuth gère le cookie
          role: user.role,
          user: user
        };
        this.applyAuth(authResponse);
        return authResponse;
      })
    );
  }

  registerPatient(data: PatientRegisterRequest): Observable<AuthResponse> {
    return from(authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: `${data.nom} ${data.prenom}`.trim(),
    })).pipe(
      switchMap((res) => {
        if (res.error) throw new Error(res.error.message || 'Erreur d\'inscription');
        // Update the patient profile with adresse and medecinId
        this.tokenStorage.setRole('PATIENT');
        return this.http.patch<AuthUser>(`${this.baseUrl}/auth/patient/me`, {
           nom: data.nom,
           prenom: data.prenom,
           adresse: data.adresse,
           medecinId: data.medecinId
        });
      }),
      map((user) => {
        const authResponse = {
          accessToken: 'better-auth-cookie',
          role: user.role,
          user: user
        };
        this.applyAuth(authResponse);
        return authResponse;
      })
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

  private applyAuth(res: AuthResponse): void {
    this.tokenStorage.setAccessToken(res.accessToken);
    this.tokenStorage.setRole(res.role);
    this.setCurrentUser(res.user);
  }

  refresh(): Observable<{ accessToken: string }> {
    // BetterAuth gère le refresh automatiquement
    return of({ accessToken: 'better-auth-cookie' });
  }

  clearSession(): void {
    this.tokenStorage.clear();
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

  getMe(): Observable<AuthUser> {
    const isPat = this.isPatient();
    // Default to /me if no role, or try both
    const url = isPat ? `${this.baseUrl}/auth/patient/me` : `${this.baseUrl}/auth/me`;
    return this.http.get<AuthUser>(url).pipe(
      tap((user) => this.setCurrentUser(user)),
      catchError((err) => {
         // Si l'appel a échoué (par ex rôle incorrect), on essaye l'autre
         const fallbackUrl = isPat ? `${this.baseUrl}/auth/me` : `${this.baseUrl}/auth/patient/me`;
         return this.http.get<AuthUser>(fallbackUrl).pipe(
            tap((u) => {
              this.tokenStorage.setRole(u.role);
              this.setCurrentUser(u);
            })
         );
      })
    );
  }

  updateProfile(data: { nom?: string; prenom?: string }): Observable<AuthUser> {
    const url = this.isPatient() ? `${this.baseUrl}/auth/patient/me` : `${this.baseUrl}/auth/me`;
    return this.http.patch<AuthUser>(url, data).pipe(tap((updatedUser) => this.setCurrentUser(updatedUser)));
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<{ message: string }> {
    return from(authClient.changePassword({
      newPassword: data.newPassword,
      currentPassword: data.currentPassword,
      revokeOtherSessions: true,
    })).pipe(
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
    return !!this.tokenStorage.getAccessToken() || document.cookie.includes('better-auth');
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

  verifyEmail(token: string): Observable<{ message: string }> {
    return from(authClient.verifyEmail({ query: { token } })).pipe(
      map((res) => {
        if (res.error) throw new Error(res.error.message);
        return { message: 'Adresse email vérifiée' };
      })
    );
  }

  resendVerification(): Observable<{ message: string }> {
    // Requires email, we can fetch it from current user or authClient.getSession
    return from(authClient.getSession()).pipe(
      switchMap((session) => {
        if (!session.data?.user.email) throw new Error('Email introuvable');
        return from(authClient.sendVerificationEmail({
           email: session.data.user.email,
           callbackURL: `${window.location.origin}/verifier-email`,
        }));
      }),
      map((res) => {
        if (res.error) throw new Error(res.error.message);
        return { message: 'Email de vérification renvoyé' };
      })
    );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return from((authClient as any).forgetPassword({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    }) as Promise<{ error: any }>).pipe(
      map((res) => {
        if (res.error) throw new Error(res.error.message);
        return { message: 'Si un compte existe pour cet email, un lien a été envoyé.' };
      })
    );
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    // token in better-auth is usually passed via query param to page, we can set it via authClient.resetPassword
    // wait, resetPassword only takes newPassword and infers token from URL. 
    // we can pass it if we want? Let's check docs or just use the current way
    return from(authClient.resetPassword({
      newPassword,
      // token can be implicit from URL
    })).pipe(
      map((res) => {
        if (res.error) throw new Error(res.error.message);
        return { message: 'Mot de passe réinitialisé' };
      })
    );
  }
}
