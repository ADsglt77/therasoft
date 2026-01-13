/**
 * Interface pour les erreurs API retournées par le backend
 * Structure: { error: { code, message, details }, requestId }
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

/**
 * Interface pour les erreurs HTTP étendues
 */
export interface ExtendedHttpErrorResponse {
  error?: ApiErrorResponse;
  message?: string;
  status?: number;
  statusText?: string;
}

