const modaliteUi: Record<string, { icon: string; label: string }> = {
  XRAY: { icon: 'image', label: 'Radiographie' },
  CT: { icon: 'file-text', label: 'Scanner (CT)' },
  MRI: { icon: 'clipboard-check', label: 'IRM' },
  US: { icon: 'mic', label: 'Échographie' },
  MAMMO: { icon: 'heart', label: 'Mammographie' },
  PET: { icon: 'sparkles', label: 'TEP' },
  OTHER: { icon: 'info', label: 'Autre' },
};

export function formatModalite(modalite: string): string {
  return modaliteUi[modalite]?.label ?? modalite;
}

export function getModaliteUi(modalite: string): { icon: string; label: string } {
  return modaliteUi[modalite] ?? { icon: 'info', label: modalite };
}
