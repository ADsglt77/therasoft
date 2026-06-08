import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  // Pointe vers l'hôte ; Better Auth cible /api/auth par défaut.
  baseURL: window.location.origin,
});
