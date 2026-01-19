/**
 * Mapping des valeurs de sexe pour l'affichage
 */
export const SEXE_LABELS: Record<string, string> = {
  M: 'Masculin',
  F: 'Féminin',
  X: 'Autre',
  UNKNOWN: 'Non renseigné',
} as const;

/**
 * Mapping des icônes de sexe
 */
export const SEXE_ICONS: Record<string, string> = {
  M: 'user', // Masculin - icône user standard
  F: 'user', // Féminin - icône user standard (peut être stylisée différemment)
  X: 'user', // Autre - icône user standard
  UNKNOWN: 'user', // Non renseigné - icône user standard
} as const;

/**
 * Formate le sexe pour l'affichage
 */
export function formatSexe(sexe: string | null): string {
  if (!sexe) return SEXE_LABELS['UNKNOWN'];
  return SEXE_LABELS[sexe] || sexe;
}

/**
 * Retourne l'icône correspondant au sexe
 */
export function getSexeIcon(sexe: string | null): string {
  if (!sexe) return SEXE_ICONS['UNKNOWN'];
  return SEXE_ICONS[sexe] || SEXE_ICONS['UNKNOWN'];
}

