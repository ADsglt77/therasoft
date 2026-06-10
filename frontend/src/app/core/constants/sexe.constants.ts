const sexeUi: Record<string, { label: string; icon: string }> = {
  M: { label: 'Masculin', icon: 'mars' },
  F: { label: 'Féminin', icon: 'venus' },
  X: { label: 'Autre', icon: 'gender-neutral' },
};

export function formatSexe(sexe: string | null): string {
  return sexe ? (sexeUi[sexe]?.label ?? sexe) : 'Non renseigné';
}

export function getSexeIcon(sexe: string | null): string {
  return sexe ? (sexeUi[sexe]?.icon ?? 'gender-neutral') : 'gender-neutral';
}

