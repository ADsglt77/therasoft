import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';

/**
 * Interface pour étendre Request avec les infos utilisateur
 */
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

/**
 * Middleware pour vérifier et valider le JWT access token
 * Attache req.user avec { medecinId, role }
 */
export const verifyAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError('Token manquant', 'AUTH_TOKEN_MISSING', 401);
    }

    const token = authHeader.substring(7); // Enlever "Bearer "
    const decoded = authService.verifyAccessToken(token);

    // Vérifier que le médecin existe toujours et reste actif (compte non désactivé)
    const medecin = await prisma.medecin.findUnique({
      where: { id: decoded.medecinId },
      select: { id: true, isActive: true },
    });

    if (!medecin || !medecin.isActive) {
      throw new ApiError('Compte invalide ou désactivé', 'AUTH_ACCOUNT_INVALID', 401);
    }

    // Attacher les infos utilisateur à la requête
    req.user = {
      medecinId: decoded.medecinId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

