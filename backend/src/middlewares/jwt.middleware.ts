import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from '../features/auth/services/auth.service';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { ApiError } from './errorHandler';

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
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError('Token manquant', 'AUTH_TOKEN_MISSING', 401);
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyAccessToken(token);

    // Rejette proprement un token patient sur une route médecin.
    if (!decoded.medecinId) {
      throw new ApiError('Accès réservé au personnel médical', 'AUTH_FORBIDDEN', 403);
    }

    const medecin = await prisma.medecin.findUnique({
      where: { id: decoded.medecinId },
      select: { id: true, isActive: true },
    });

    if (!medecin || !medecin.isActive) {
      throw new ApiError('Compte invalide ou désactivé', 'AUTH_ACCOUNT_INVALID', 401);
    }

    req.user = {
      medecinId: decoded.medecinId,
      role: decoded.role,
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
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError('Token manquant', 'AUTH_TOKEN_MISSING', 401);
    }

    const token = authHeader.substring(7);
    let decoded: { patientId?: number; role?: string };
    try {
      decoded = jwt.verify(token, env.jwtAccessSecret) as { patientId?: number; role?: string };
    } catch {
      throw new ApiError('Token invalide ou expiré', 'AUTH_INVALID_TOKEN', 401);
    }

    if (decoded.role !== 'PATIENT' || !decoded.patientId) {
      throw new ApiError('Accès réservé aux patients', 'AUTH_FORBIDDEN', 403);
    }

    const patient = await prisma.patient.findUnique({
      where: { id: decoded.patientId },
      select: { id: true },
    });

    if (!patient) {
      throw new ApiError('Compte invalide', 'AUTH_ACCOUNT_INVALID', 401);
    }

    req.user = {
      patientId: decoded.patientId,
      role: 'PATIENT',
    };

    next();
  } catch (error) {
    next(error);
  }
};
