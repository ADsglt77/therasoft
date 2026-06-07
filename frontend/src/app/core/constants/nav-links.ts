/**
 * Liens de navigation selon le rôle — source unique utilisée par toutes les
 * navbars (dashboard sidebar/bottom, menu d'accueil, tiroir mobile) pour garantir
 * une navigation cohérente et role-aware.
 */
export interface NavLink {
  icon: string;
  text: string;
  route: string;
  /** routerLinkActive exact (false pour les routes ayant des sous-routes, ex. /calendar/:date). */
  exact: boolean;
}

const PATIENT_LINKS: NavLink[] = [
  { icon: 'calendar-heart', text: 'Prendre rendez-vous', route: '/prendre-rendez-vous', exact: true },
  { icon: 'calendar', text: 'Mes rendez-vous', route: '/mes-rendez-vous', exact: true },
  { icon: 'settings', text: 'Paramètres', route: '/settings', exact: true },
];

const MEDECIN_LINKS: NavLink[] = [
  { icon: 'globe', text: 'Site', route: '/site', exact: true },
  { icon: 'calendar', text: 'Calendrier', route: '/calendar', exact: false },
  { icon: 'settings', text: 'Paramètres', route: '/settings', exact: true },
];

/** Liens de navigation pour un rôle (PATIENT vs personnel médical). */
export function navLinksForRole(role: string | null | undefined): NavLink[] {
  return role === 'PATIENT' ? PATIENT_LINKS : MEDECIN_LINKS;
}
