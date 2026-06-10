import { Request } from 'express';
import { env } from '../config/env';

function stripSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Renvoie l'origine si elle est de confiance, sinon `null`.
 *
 * Sécurité : si une origine de production est configurée (non-localhost), seule
 * cette origine (FRONTEND_ORIGIN ou APP_URL) est acceptée — évite l'injection de
 * domaine dans les liens. En dev (localhost configuré), toute origine valide passe.
 */
function trustedOrigin(origin: string | null | undefined): string | null {
  if (!origin || !/^https?:\/\/[^/]+\/?$/i.test(origin)) {
    return null;
  }
  const clean = stripSlash(origin);
  const configuredIsLocal = env.frontendOrigin.startsWith('http://localhost');
  if (
    configuredIsLocal ||
    clean === stripSlash(env.frontendOrigin) ||
    clean === stripSlash(env.appUrl)
  ) {
    return clean;
  }
  return null;
}

/**
 * URL de base pour les liens envoyés par email. On privilégie l'origine réelle
 * de la requête (le domaine utilisé par le navigateur, transmis par le reverse
 * proxy via l'en-tête Origin), avec repli sur APP_URL / FRONTEND_ORIGIN.
 */
export function emailBaseUrl(req: Request): string {
  return trustedOrigin(req.get('origin')) ?? stripSlash(env.appUrl);
}

/**
 * Extrait l'en-tête `Origin` d'une requête, quelle que soit sa forme :
 * Web Request (Better Auth/`toNodeHandler`), Express `Request`, ou Node brut.
 */
function requestOrigin(request: unknown): string | undefined {
  const r = request as {
    headers?: { get?: (k: string) => string | null; origin?: string };
    get?: (k: string) => string | undefined;
  };
  try {
    return r?.headers?.get?.('origin') ?? r?.headers?.origin ?? r?.get?.('origin') ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Réécrit l'origine (protocole + host) d'un lien selon l'origine de la requête,
 * si celle-ci est de confiance. Sinon le lien est laissé inchangé (déjà bâti sur
 * APP_URL). Sert à faire pointer les liens email Better Auth vers le vrai domaine.
 */
export function withRequestOrigin(url: string, request: unknown): string {
  const trusted = trustedOrigin(requestOrigin(request));
  if (!trusted) {
    return url;
  }
  try {
    const target = new URL(url);
    const origin = new URL(trusted);
    target.protocol = origin.protocol;
    target.host = origin.host;
    return target.toString();
  } catch {
    return url;
  }
}
