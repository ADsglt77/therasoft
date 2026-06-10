import { Injectable } from '@angular/core';

type Theme = 'dark' | 'light';

/**
 * Service de gestion du thème dark/light
 * Applique le thème via html[data-theme] et persiste dans localStorage
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storageKey = 'theme';

  private setTheme(theme: Theme): void {
    document.documentElement.dataset['theme'] = theme;
    localStorage.setItem(this.storageKey, theme);
  }

  toggle(): void {
    this.setTheme(this.getTheme() === 'dark' ? 'light' : 'dark');
  }

  getTheme(): Theme {
    const theme = document.documentElement.dataset['theme'];
    return theme === 'light' ? 'light' : 'dark';
  }
}

