import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';
import { apiInterceptor } from './app/api/api.interceptor';

function initTheme(): void {
  const stored = localStorage.getItem('theme');
  const theme =
    stored === 'light' || stored === 'dark'
      ? stored
      : window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
  document.documentElement.dataset['theme'] = theme;
  localStorage.setItem('theme', theme);
}

initTheme();

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([apiInterceptor])),
  ],
}).catch((err) => console.error(err));




