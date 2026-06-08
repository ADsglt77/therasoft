import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { ApiError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        medecinId?: number;
        patientId?: number;
        role: string;
      };
    }
  }
}

export const verifySession = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    console.log("verifySession - req.cookies:", req.cookies, "session:", session ? session.user.id : "null");

    if (!session) {
      throw new ApiError('Non authentifié', 'AUTH_UNAUTHORIZED', 401);
    }
    
    let medecinId: number | undefined;
    let patientId: number | undefined;
    
    if (session.user.role === 'MEDECIN' || session.user.role === 'SECRETAIRE') {
      const medecin = await prisma.medecin.findUnique({ where: { userId: session.user.id } });
      if (!medecin || !medecin.isActive) {
        throw new ApiError('Compte invalide ou désactivé', 'AUTH_ACCOUNT_INVALID', 401);
      }
      medecinId = medecin.id;
    } else if (session.user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } });
      if (!patient) {
        throw new ApiError('Compte invalide', 'AUTH_ACCOUNT_INVALID', 401);
      }
      patientId = patient.id;
    }

    req.user = {
      id: session.user.id,
      medecinId,
      patientId,
      role: session.user.role || 'PATIENT',
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const verifyAccessToken = verifySession;
export const verifyPatientAccessToken = verifySession;
