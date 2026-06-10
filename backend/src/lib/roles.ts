import { Role } from '@prisma/client';

const STAFF_ROLES: readonly Role[] = [Role.MEDECIN];

/** Convertit une valeur quelconque en `Role` connu, sinon `null`. */
export function parseRole(value: unknown): Role | null {
  return typeof value === 'string' && (Object.values(Role) as string[]).includes(value)
    ? (value as Role)
    : null;
}

/** Vrai si le rôle relève du personnel médical (accès au dashboard médecin). */
export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

/** Découpe un "Nom Prénom" en `{ nom, prenom }` de façon robuste. */
export function splitProfileName(name: string): { nom: string; prenom: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { nom: parts[0] ?? 'Inconnu', prenom: parts.slice(1).join(' ') };
}
