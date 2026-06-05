import { BadgeVariant } from '../../components/badge/ui-badge.component';
import { formatDateKey } from './date.utils';

/** Aligné sur les données seed (année de démo) */
export const PLANNING_YEAR = 2026;

export type CalendarDayStatus = 'travail' | 'repos' | 'vacances' | 'ferie';

const JOURS_FERIES = new Set<string>([
  `${PLANNING_YEAR}-01-01`,
  `${PLANNING_YEAR}-04-06`,
  `${PLANNING_YEAR}-05-01`,
  `${PLANNING_YEAR}-05-08`,
  `${PLANNING_YEAR}-05-14`,
  `${PLANNING_YEAR}-05-25`,
  `${PLANNING_YEAR}-07-14`,
  `${PLANNING_YEAR}-08-15`,
  `${PLANNING_YEAR}-11-01`,
  `${PLANNING_YEAR}-11-11`,
  `${PLANNING_YEAR}-12-25`,
]);

export const DAY_STATUS_LABELS: Record<Exclude<CalendarDayStatus, 'travail'>, string> = {
  repos: 'Repos',
  vacances: 'Vacances',
  ferie: 'Férié',
};

export function isWeekendLocal(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month, day).getDay();
  return dow === 0 || dow === 6;
}

export function isJourFerie(year: number, month: number, day: number): boolean {
  if (year !== PLANNING_YEAR) {
    return false;
  }
  return JOURS_FERIES.has(formatDateKey(year, month, day));
}

/**
 * Détermine le statut d'un jour pour le calendrier médecin.
 * Jour ouvré sans vacation en base = vacances (congés seed).
 */
export function resolveDayStatus(
  year: number,
  month: number,
  day: number,
  hasVacation: boolean,
  disabled = false
): CalendarDayStatus {
  if (disabled) {
    return 'repos';
  }
  if (isWeekendLocal(year, month, day)) {
    return 'repos';
  }
  if (isJourFerie(year, month, day)) {
    return 'ferie';
  }
  if (hasVacation) {
    return 'travail';
  }
  return 'vacances';
}

export function dayStatusToBadgeVariant(status: CalendarDayStatus): BadgeVariant {
  switch (status) {
    case 'travail':
      return 'success';
    case 'repos':
      return 'repos';
    case 'vacances':
      return 'vacances';
    case 'ferie':
      return 'ferie';
  }
}

export function dayStatusBadgeText(status: CalendarDayStatus, location?: string): string {
  if (status === 'travail' && location) {
    return location;
  }
  if (status === 'travail') {
    return 'Travail';
  }
  return DAY_STATUS_LABELS[status];
}
