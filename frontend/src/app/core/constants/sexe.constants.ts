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
  M: 'mars', // Masculin - symbole Mars ♂
  F: 'venus', // Féminin - symbole Venus ♀
  X: 'gender-neutral', // Autre - icône genre neutre
  UNKNOWN: 'gender-neutral', // Non renseigné - icône genre neutre
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

