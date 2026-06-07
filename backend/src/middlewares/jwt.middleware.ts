import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from './errorHandler';
import { getBetterAuth, requestHeaders } from '../lib/better-auth';

declare global {
  namespace Express {
    interface Request {
      user?: {
        medecinId?: number;
        patientId?: number;
        role: string;
      };
    }
  }
}

/**
 * Vérifie un access token médecin (rôle MEDECIN / SECRETAIRE).
 */
export const verifyAccessToken = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auth = await getBetterAuth();
    const session = await auth.api.getSession({
      headers: requestHeaders(req),
      query: { disableRefresh: false },
    });

    if (!session) {
      throw new ApiError('Session expirée', 'AUTH_UNAUTHORIZED', 401);
    }
    if (session.user.role === 'PATIENT' || session.user.profileType !== 'MEDECIN') {
      throw new ApiError('Accès réservé au personnel médical', 'AUTH_FORBIDDEN', 403);
    }

    const medecin = await prisma.medecin.findUnique({
      where: { id: session.user.profileId },
      select: { id: true, isActive: true },
    });

    if (!medecin || !medecin.isActive) {
      throw new ApiError('Compte invalide ou désactivé', 'AUTH_ACCOUNT_INVALID', 401);
    }

    req.user = {
      medecinId: medecin.id,
      role: session.user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Vérifie un access token patient (rôle PATIENT).
 */
export const verifyPatientAccessToken = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auth = await getBetterAuth();
    const session = await auth.api.getSession({
      headers: requestHeaders(req),
      query: { disableRefresh: false },
    });

    if (!session) {
      throw new ApiError('Session expirée', 'AUTH_UNAUTHORIZED', 401);
    }
    if (session.user.role !== 'PATIENT' || session.user.profileType !== 'PATIENT') {
      throw new ApiError('Accès réservé aux patients', 'AUTH_FORBIDDEN', 403);
    }

    const patient = await prisma.patient.findUnique({
      where: { id: session.user.profileId },
      select: { id: true },
    });

    if (!patient) {
      throw new ApiError('Compte invalide', 'AUTH_ACCOUNT_INVALID', 401);
    }

    req.user = {
      patientId: patient.id,
      role: 'PATIENT',
    };

    next();
  } catch (error) {
    next(error);
  }
};
