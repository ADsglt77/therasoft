/**
 * Mapping des modalités pour l'affichage
 */
export const MODALITE_LABELS: Record<string, string> = {
  XRAY: 'Radiographie',
  CT: 'Scanner (CT)',
  MRI: 'IRM',
  US: 'Échographie',
  MAMMO: 'Mammographie',
  PET: 'TEP',
  OTHER: 'Autre',
} as const;

/**
 * Formate la modalité pour l'affichage
 */
export function formatModalite(modalite: string): string {
  return MODALITE_LABELS[modalite] || modalite;
}

