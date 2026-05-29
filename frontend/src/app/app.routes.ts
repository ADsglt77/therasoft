import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
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
    path: '',
    loadComponent: () =>
      import('./pages/main/main-page.component').then(
        (m) => m.MainPageComponent
      ),
    pathMatch: 'full',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/main-page.component').then(
        (m) => m.DashboardMainPageComponent
      ),
    children: [
      {
        path: 'calendar/:date/:rdvId',
        loadComponent: () =>
          import('./pages/dashboard/patient-detail/dashboard-patient-detail-page.component').then(
            (m) => m.DashboardPatientDetailPageComponent
          ),
      },
      {
        path: 'calendar/:date',
        loadComponent: () =>
          import('./pages/dashboard/planning-day/dashboard-planning-day-page.component').then(
            (m) => m.DashboardPlanningDayPageComponent
          ),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./pages/dashboard/planning/dashboard-planning-page.component').then(
            (m) => m.DashboardPlanningPageComponent
          ),
      },
      {
        path: 'site',
        loadComponent: () =>
          import('./pages/dashboard/site/dashboard-site-page.component').then(
            (m) => m.DashboardSitePageComponent
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
