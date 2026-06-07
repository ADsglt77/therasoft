import { Request } from 'express';
import { env } from '../config/env';

function stripSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * URL de base pour les liens envoyés par email. On privilégie l'origine réelle
 * de la requête (le domaine utilisé par le navigateur, transmis par le reverse
 * proxy via l'en-tête Origin), avec repli sur APP_URL / FRONTEND_ORIGIN.
 *
 * Sécurité : si une origine de production est configurée (non-localhost), seule
 * cette origine est acceptée — évite l'injection de domaine dans les liens.
 */
export function emailBaseUrl(req: Request): string {
  const fallback = stripSlash(env.appUrl);
  const origin = req.get('origin');
  if (!origin || !/^https?:\/\/[^/]+\/?$/i.test(origin)) {
    return fallback;
  }
  const clean = stripSlash(origin);
  const configuredIsLocal = env.frontendOrigin.startsWith('http://localhost');
  if (configuredIsLocal || clean === stripSlash(env.frontendOrigin) || clean === fallback) {
    return clean;
  }
  return fallback;
}
