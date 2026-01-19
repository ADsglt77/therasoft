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
 * Formate une date au format français court (ex: "15/03/2025")
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formate une heure au format "HHhmm"
 */
export function formatTime(timeString: string | Date): string {
  const date = typeof timeString === 'string' ? new Date(timeString) : timeString;
  
  if (isNaN(date.getTime())) {
    console.error('Invalid time format:', timeString);
    return '00h00';
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}h${minutes}`;
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

