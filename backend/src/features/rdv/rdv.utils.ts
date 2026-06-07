/**
 * Helpers purs de la feature RDV : conversions de temps (UTC), jour de semaine,
 * clés de date et distance GPS. Sans I/O ni dépendances — faciles à tester.
 */

export interface OpeningHour {
  day: number; // 1 = lundi … 7 = dimanche
  open: string; // "HH:mm"
  close: string; // "HH:mm"
}

/** Durée par défaut d'un créneau (minutes) si aucune config de modalité. */
export const DEFAULT_DURATION_MIN = 30;

/** Libellés FR des modalités (emails, affichage). */
export const MODALITE_LABELS: Record<string, string> = {
  XRAY: 'Radiographie',
  CT: 'Scanner (CT)',
  MRI: 'IRM',
  US: 'Échographie',
  MAMMO: 'Mammographie',
  PET: 'TEP',
  OTHER: 'Autre',
};

export function modaliteLabel(modalite: string): string {
  return MODALITE_LABELS[modalite] ?? modalite;
}

/** "HH:mm" → minutes depuis minuit. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** minutes depuis minuit → "HH:mm". */
export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Time(0) stocké en UTC → minutes depuis minuit. */
export function timeDateToMinutes(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** "HH:mm" → Date Time(0) (UTC 1970-01-01). */
export function timeStrToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0, 0));
}

/** Jour ISO de la semaine (1 = lundi … 7 = dimanche) en UTC. */
export function isoWeekdayUtc(date: Date): number {
  const d = date.getUTCDay();
  return d === 0 ? 7 : d;
}

/** Date UTC → clé "YYYY-MM-DD". */
export function utcDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Distance à vol d'oiseau (km) entre deux points GPS (formule de haversine). */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
