import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { medecinGuard, patientGuard } from './core/guards/role.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/main/auth/auth-page.component').then((m) => m.AuthPageComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/main/auth/auth-page.component').then((m) => m.AuthPageComponent),
  },
  {
    path: '',
    loadComponent: () => import('./pages/main/main-page.component').then((m) => m.MainPageComponent),
    pathMatch: 'full',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/main-page.component').then((m) => m.DashboardMainPageComponent),
    children: [
      {
        path: 'calendar/:date/:rdvId',
        canActivate: [medecinGuard],
        loadComponent: () =>
          import('./pages/dashboard/patient-detail/dashboard-patient-detail-page.component').then(
            (m) => m.DashboardPatientDetailPageComponent
          ),
      },
      {
        path: 'calendar/:date',
        canActivate: [medecinGuard],
        loadComponent: () =>
          import('./pages/dashboard/planning-day/dashboard-planning-day-page.component').then(
            (m) => m.DashboardPlanningDayPageComponent
          ),
      },
      {
        path: 'calendar',
        canActivate: [medecinGuard],
        loadComponent: () =>
          import('./pages/dashboard/planning/dashboard-planning-page.component').then(
            (m) => m.DashboardPlanningPageComponent
          ),
      },
      {
        path: 'site',
        canActivate: [medecinGuard],
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
      {
        path: 'prendre-rendez-vous',
        canActivate: [patientGuard],
        loadComponent: () =>
          import('./pages/dashboard/prendre-rdv/dashboard-prendre-rdv-page.component').then(
            (m) => m.DashboardPrendreRdvPageComponent
          ),
      },
      {
        path: 'mes-rendez-vous',
        canActivate: [patientGuard],
        loadComponent: () =>
          import('./pages/dashboard/mes-rdv/dashboard-mes-rdv-page.component').then(
            (m) => m.DashboardMesRdvPageComponent
          ),
      },
    ],
  },
  // Toute URL inconnue renvoie vers l'accueil.
  { path: '**', redirectTo: '' },
];
