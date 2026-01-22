import { Injectable } from '@angular/core';

export type Theme = 'dark' | 'light';

/**
 * Service de gestion du thème dark/light
 * Applique le thème via html[data-theme] et persiste dans localStorage
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'theme';

  /**
   * Initialise le thème au démarrage :
   * 1. Vérifie localStorage
   * 2. Sinon, suit prefers-color-scheme
   * 3. Sinon, dark par défaut
   */
  init(): void {
    const savedTheme = this.getStoredTheme();
    const systemTheme = this.getSystemTheme();
    const theme = savedTheme || systemTheme || 'dark';
    this.setTheme(theme);
  }

  /**
   * Applique un thème et le persiste dans localStorage
   */
  setTheme(theme: Theme): void {
    document.documentElement.dataset['theme'] = theme;
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  /**
   * Bascule entre dark et light
   */
  toggle(): void {
    const currentTheme = this.getTheme();
    const newTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  /**
   * Retourne le thème actuel depuis le DOM
   */
  getTheme(): Theme {
    const theme = document.documentElement.dataset['theme'];
    return (theme === 'light' || theme === 'dark') ? theme : 'dark';
  }

  /**
   * Récupère le thème depuis localStorage
   */
  private getStoredTheme(): Theme | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return (stored === 'light' || stored === 'dark') ? stored : null;
  }

  /**
   * Détecte le thème système via prefers-color-scheme
   */
  private getSystemTheme(): Theme | null {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return null;
    }
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
}

