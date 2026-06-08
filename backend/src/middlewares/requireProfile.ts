import { Request } from 'express';
import { ApiError } from './errorHandler';

export function requireMedecinId(req: Request): number {
  if (!req.user?.medecinId) {
    throw new ApiError('Non authentifié', 'AUTH_UNAUTHORIZED', 401);
  }
  return req.user.medecinId;
}

export function requirePatientId(req: Request): number {
  if (!req.user?.patientId) {
    throw new ApiError('Non authentifié', 'AUTH_UNAUTHORIZED', 401);
  }
  return req.user.patientId;
}
