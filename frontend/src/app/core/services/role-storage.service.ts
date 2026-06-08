import { Injectable } from '@angular/core';

const ROLE_KEY = 'role';

/**
 * Conserve le rôle de l'utilisateur connecté. La session elle-même est gérée
 * par Better Auth (cookie httpOnly) ; ce rôle sert d'indicateur d'authentification
 * synchrone pour les guards et à choisir le bon endpoint de profil.
 */
@Injectable({ providedIn: 'root' })
export class RoleStorageService {
  setRole(role: string): void {
    localStorage.setItem(ROLE_KEY, role);
  }

  getRole(): string | null {
    return localStorage.getItem(ROLE_KEY);
  }

  /** Vide l'état d'authentification (logout). */
  clear(): void {
    localStorage.removeItem(ROLE_KEY);
  }
}
