import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'access_token';
const ROLE_KEY = 'role';

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  setRole(role: string): void {
    localStorage.setItem(ROLE_KEY, role);
  }

  getRole(): string | null {
    return localStorage.getItem(ROLE_KEY);
  }

  /** Vide tout le stockage d'authentification (logout). */
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  }
}
