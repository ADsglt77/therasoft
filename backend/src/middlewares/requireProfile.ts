import { Request } from 'express';
import { ApiError } from './errorHandler';

export function requireMedecinId(req: Request): number {
  if (!req.user) {
    throw new ApiError('Non authentifié', 'AUTH_UNAUTHORIZED', 401);
  }
  if (!req.user.medecinId) {
    throw new ApiError('Accès réservé aux médecins', 'FORBIDDEN', 403);
  }
  return req.user.medecinId;
}

export function requirePatientId(req: Request): number {
  if (!req.user) {
    throw new ApiError('Non authentifié', 'AUTH_UNAUTHORIZED', 401);
  }
  if (!req.user.patientId) {
    throw new ApiError('Accès réservé aux patients', 'FORBIDDEN', 403);
  }
  return req.user.patientId;
}
