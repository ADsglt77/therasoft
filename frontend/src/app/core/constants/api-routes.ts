/**
 * Routes API qui ne doivent PAS recevoir de Bearer token
 */
export const AUTH_PUBLIC_ROUTES = ['/auth/login', '/auth/register'] as const;

/**
 * Routes API pour lesquelles un 401 ne doit PAS déclencher un token refresh
 */
export const AUTH_NO_REFRESH_ROUTES = ['/auth/login', '/auth/register', '/auth/refresh'] as const;

/**
 * Routes API dont les erreurs 401 sont gérées dans le composant (pas de redirect)
 */
export const AUTH_COMPONENT_HANDLED_ROUTES = ['/auth/password'] as const;

/**
 * Vérifie si l'URL correspond à une des routes dans la liste
 */
export function matchesRoute(url: string, routes: readonly string[]): boolean {
  return routes.some((route) => url.includes(route));
}

/**
 * Vérifie si l'URL est une requête API
 */
export function isApiRequest(url: string): boolean {
  return url.includes('/api/');
}
