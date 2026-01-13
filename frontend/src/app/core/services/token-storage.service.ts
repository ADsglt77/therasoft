import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'access_token';

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  /**
   * Sauvegarde l'access token dans le localStorage
   */
  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  /**
   * Récupère l'access token depuis le localStorage
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Supprime l'access token
   */
  removeAccessToken(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Vide tout le stockage (pour logout)
   */
  clear(): void {
    this.removeAccessToken();
  }
}

