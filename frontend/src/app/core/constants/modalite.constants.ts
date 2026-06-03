/**
 * Modalité = type d'examen / machine (enum ModaliteType côté API).
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

export const MODALITE_UI: Record<string, { icon: string; label: string }> = {
  XRAY: { icon: 'image', label: MODALITE_LABELS['XRAY'] },
  CT: { icon: 'file-text', label: MODALITE_LABELS['CT'] },
  MRI: { icon: 'clipboard-check', label: MODALITE_LABELS['MRI'] },
  US: { icon: 'mic', label: MODALITE_LABELS['US'] },
  MAMMO: { icon: 'heart', label: MODALITE_LABELS['MAMMO'] },
  PET: { icon: 'sparkles', label: MODALITE_LABELS['PET'] },
  OTHER: { icon: 'info', label: MODALITE_LABELS['OTHER'] },
};

export function formatModalite(modalite: string): string {
  return MODALITE_LABELS[modalite] || modalite;
}

export function getModaliteUi(modalite: string): { icon: string; label: string } {
  return MODALITE_UI[modalite] ?? { icon: 'info', label: formatModalite(modalite) };
}
