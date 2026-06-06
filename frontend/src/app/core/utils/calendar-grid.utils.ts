import { formatDateKey } from './date.utils';

export interface MonthGridCell {
  dayNumber: number;
  year: number;
  month: number; // 0-11
  dateKey: string; // YYYY-MM-DD
  inCurrentMonth: boolean;
  isToday: boolean;
}

const WEEKS = 5;
const DAYS = 7;

/** Index du jour dans la semaine (0 = lundi … 6 = dimanche). */
function dayOfWeekIndex(date: Date): number {
  const js = date.getDay();
  return js === 0 ? 6 : js - 1;
}

/**
 * Construit la grille d'un mois (5×7) : jours du mois + débordement avant/après.
 * Logique extraite de la page planning, réutilisable pour tout calendrier mois.
 */
export function buildMonthGrid(year: number, month: number, today = new Date()): MonthGridCell[] {
  const cells: MonthGridCell[] = [];

  const push = (y: number, m: number, d: number, inMonth: boolean): void => {
    cells.push({
      dayNumber: d,
      year: y,
      month: m,
      dateKey: formatDateKey(y, m, d),
      inCurrentMonth: inMonth,
      isToday: today.getFullYear() === y && today.getMonth() === m && today.getDate() === d,
    });
  };

  const firstIndex = dayOfWeekIndex(new Date(year, month, 1));
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrev = new Date(prevYear, prevMonth + 1, 0).getDate();
  for (let d = daysInPrev - firstIndex + 1; d <= daysInPrev; d++) {
    push(prevYear, prevMonth, d, false);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    push(year, month, d, true);
  }

  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const remaining = WEEKS * DAYS - cells.length;
  for (let d = 1; d <= remaining; d++) {
    push(nextYear, nextMonth, d, false);
  }

  return cells;
}
