import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';
import { requestIdInterceptor } from './app/api/interceptors/request-id.interceptor';
import { authInterceptor } from './app/api/interceptors/auth.interceptor';
import { errorInterceptor } from './app/api/interceptors/error.interceptor';
import { ThemeService } from './app/shared/theme/theme.service';

/**
 * Initialise le thème de manière synchrone avant le bootstrap pour éviter le flash
 * Flow: localStorage → prefers-color-scheme → dark (défaut)
 */
function initTheme(): void {
  const STORAGE_KEY = 'theme';
  let theme: 'dark' | 'light' = 'dark';

  // 1. Vérifier localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    }
  }

  // 2. Sinon, suivre prefers-color-scheme
  if (theme === 'dark' && typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
  }

  // 3. Appliquer le thème
  document.documentElement.dataset['theme'] = theme;
}

// Initialiser le thème AVANT le bootstrap
initTheme();

/**
 * Routes principales de l'application :
 * - / : Page principale (main)
 * - /login : Page de connexion
 * - /register : Page d'inscription
 * - /dashboard : Dashboard (protégé par authGuard)
 *   - /dashboard/planning : Planning
 *   - /dashboard/planning/:day : Planning du jour
 *   - /dashboard/settings : Paramètres
 */
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes),
    provideHttpClient(
      withInterceptors([requestIdInterceptor, authInterceptor, errorInterceptor])
    ),
  ],
}).catch((err) => console.error(err));




