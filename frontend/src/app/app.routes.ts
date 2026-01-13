import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/main/main-page.component').then(
        (m) => m.MainPageComponent
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/main/auth/auth-page.component').then(
        (m) => m.AuthPageComponent
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/main/auth/auth-page.component').then(
        (m) => m.AuthPageComponent
      ),
  },
  {
    path: 'playground',
    loadComponent: () =>
      import('./pages/playground/playground-page.component').then(
        (m) => m.PlaygroundPageComponent
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard], // Protection de la route dashboard
    loadComponent: () =>
      import('./layout/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent
      ),
    children: [
      {
        path: '',
        redirectTo: 'planning',
        pathMatch: 'full',
      },
      {
        path: 'planning',
        loadComponent: () =>
          import('./pages/dashboard/planning/dashboard-planning-page.component').then(
            (m) => m.DashboardPlanningPageComponent
          ),
      },
      {
        path: 'planning/:day',
        loadComponent: () =>
          import('./pages/dashboard/planning-day/dashboard-planning-day-page.component').then(
            (m) => m.DashboardPlanningDayPageComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/dashboard/settings/dashboard-settings-page.component').then(
            (m) => m.DashboardSettingsPageComponent
          ),
      },
    ],
  },
];
