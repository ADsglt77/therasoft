/**
 * Endpoints d'authentification Better Auth dont un 401 est légitime (mauvais
 * identifiants, mot de passe actuel incorrect, lien invalide…) : l'erreur est
 * gérée par le composant appelant, sans déconnexion forcée.
 */
export const AUTH_COMPONENT_HANDLED_ROUTES = [
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/sign-out',
  '/auth/change-password',
  '/auth/forget-password',
  '/auth/reset-password',
  '/auth/verify-email',
] as const;

/** Vrai si l'URL contient l'une des routes listées. */
export function matchesRoute(url: string, routes: readonly string[]): boolean {
  return routes.some((route) => url.includes(route));
}

/** Vrai si l'URL est un appel à l'API. */
export function isApiRequest(url: string): boolean {
  return url.includes('/api/');
}
