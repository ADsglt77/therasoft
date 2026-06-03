import { Request, Response, NextFunction } from 'express';
import { authService } from '../features/auth/services/auth.service';
import { prisma } from '../lib/prisma';
import { ApiError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: {
        medecinId: number;
        role: string;
      };
    }
  }
}

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
