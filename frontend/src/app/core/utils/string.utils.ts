/**
 * Utilitaires pour la manipulation de chaînes de caractères
 */

/**
 * Parse une liste de documents séparés par virgule
 */
export function parseDocumentsList(documents: string | null): string[] {
  if (!documents) return [];
  return documents
    .split(',')
    .map((doc) => doc.trim())
    .filter((doc) => doc.length > 0);
}

