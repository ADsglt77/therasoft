import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';
import { requestIdInterceptor } from './app/api/interceptors/request-id.interceptor';
import { authInterceptor } from './app/api/interceptors/auth.interceptor';
import { errorInterceptor } from './app/api/interceptors/error.interceptor';

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




