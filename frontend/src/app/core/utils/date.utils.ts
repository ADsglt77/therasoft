/**
 * Utilitaires pour le formatage des dates et heures
 */

/**
 * Formate une date au format français long (ex: "15 mars 2025")
 */
export function formatDateLong(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Construit une clé de date "YYYY-MM-DD" à partir de composantes locales.
 * @param month Mois indexé à partir de 0 (comme Date.getMonth()).
 */
export function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Formate une heure au format "HHhmm" depuis une string ISO time, un format "HH:mm:ss", ou un objet Date
 */
export function formatTime(timeString: string | Date): string {
  let hours: number;
  let minutes: number;

  if (typeof timeString === 'string') {
    // Essayer d'abord le format time simple (HH:mm:ss ou HH:mm)
    const timeMatch = timeString.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
    } else {
      // Sinon, essayer de parser comme Date ISO
      const date = new Date(timeString);
      if (isNaN(date.getTime())) {
        return '00h00';
      }
      hours = date.getUTCHours();
      minutes = date.getUTCMinutes();
    }
  } else {
    if (isNaN(timeString.getTime())) {
      return '00h00';
    }
    hours = timeString.getUTCHours();
    minutes = timeString.getUTCMinutes();
  }

  return `${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`;
}

/**
 * Calcule l'âge à partir d'une date de naissance
 */
export function calculateAge(dateNaissance: string): number {
  const birthDate = new Date(dateNaissance);
  if (Number.isNaN(birthDate.getTime())) {
    return 0;
  }
  const todayKey = parisDateKey();
  const [todayYear, todayMonth, todayDay] = todayKey.split('-').map(Number);
  const birthYear = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth() + 1;
  const birthDay = birthDate.getUTCDate();
  let age = todayYear - birthYear;
  const monthDiff = todayMonth - birthMonth;
  
  if (monthDiff < 0 || (monthDiff === 0 && todayDay < birthDay)) {
    age--;
  }
  
  return age;
}

export function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return formatDateKey(date.getFullYear(), date.getMonth(), date.getDate()) === value
    ? date
    : null;
}

export function parisDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values['year']}-${values['month']}-${values['day']}`;
}

export function parisDateTimeKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values['year']}-${values['month']}-${values['day']}T${values['hour']}:${values['minute']}`;
}

export function appointmentDateTimeKey(dateString: string, timeString: string): string {
  const dateKey = dateString.slice(0, 10);
  const time = formatTime(timeString).replace('h', ':');
  return `${dateKey}T${time}`;
}

