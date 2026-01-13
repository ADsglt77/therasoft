import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse } from '../interfaces/api-error.interface';

/**
 * Utilitaire pour gérer les erreurs API de manière centralisée
 */
export class ApiErrorHandler {
  /**
   * Extrait les informations d'erreur depuis une HttpErrorResponse
   */
  static extractError(error: HttpErrorResponse | any): {
    code: string | null;
    message: string;
    details: unknown | null;
    requestId: string | null;
  } {
    // Erreur réseau (pas de réponse serveur)
    if (this.isNetworkError(error)) {
      return {
        code: null,
        message: this.getNetworkErrorMessage(error),
        details: null,
        requestId: null,
      };
    }

    // Erreur API formatée
    const apiError = error.error as ApiErrorResponse | undefined;
    if (apiError?.error) {
      return {
        code: apiError.error.code || null,
        message: apiError.error.message || 'Une erreur est survenue',
        details: apiError.error.details || null,
        requestId: apiError.requestId || null,
      };
    }

    // Erreur HTTP non formatée
    return {
      code: null,
      message: error.message || `Erreur ${error.status || 'inconnue'}`,
      details: null,
      requestId: null,
    };
  }

  /**
   * Détecte si l'erreur est une erreur réseau
   */
  static isNetworkError(error: any): boolean {
    if (error instanceof HttpErrorResponse) {
      // Status 0 = erreur réseau (CORS, timeout, pas de connexion)
      // Status 500+ = erreur serveur (peut être considérée comme erreur réseau)
      return error.status === 0 || error.status >= 500;
    }
    // Si pas de status, probablement une erreur réseau
    return !error?.error?.error;
  }

  /**
   * Obtient le message d'erreur réseau approprié
   */
  static getNetworkErrorMessage(error: any): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
      }
      if (error.status >= 500) {
        return 'Le serveur rencontre un problème. Veuillez réessayer plus tard.';
      }
      if (error.status === 404) {
        return 'Service non disponible. Veuillez réessayer plus tard.';
      }
    }
    return 'Erreur de connexion. Veuillez réessayer.';
  }

  /**
   * Vérifie si l'erreur est une erreur de validation (VALIDATION_ERROR)
   */
  static isValidationError(error: HttpErrorResponse | any): boolean {
    const extracted = this.extractError(error);
    return extracted.code === 'VALIDATION_ERROR' && Array.isArray(extracted.details);
  }

  /**
   * Obtient les détails de validation sous forme de tableau
   */
  static getValidationDetails(error: HttpErrorResponse | any): Array<{
    path: string[];
    message: string;
  }> {
    const extracted = this.extractError(error);
    if (extracted.code === 'VALIDATION_ERROR' && Array.isArray(extracted.details)) {
      return extracted.details as Array<{ path: string[]; message: string }>;
    }
    return [];
  }
}

