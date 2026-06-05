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
        console.error('Invalid time format:', timeString);
        return '00h00';
      }
      hours = date.getHours();
      minutes = date.getMinutes();
    }
  } else {
    if (isNaN(timeString.getTime())) {
      console.error('Invalid Date object:', timeString);
      return '00h00';
    }
    hours = timeString.getHours();
    minutes = timeString.getMinutes();
  }

  return `${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`;
}

/**
 * Calcule l'âge à partir d'une date de naissance
 */
export function calculateAge(dateNaissance: string): number {
  const birthDate = new Date(dateNaissance);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

