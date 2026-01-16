import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { registerSchema, loginSchema, changePasswordSchema, updateProfileSchema } from '../schemas/auth.schemas';
import { verifyAccessToken } from '../middlewares/jwt.middleware';
import { ApiError } from '../../../middlewares/errorHandler';
import { env } from '../../../config/env';

const router = Router();

/**
 * POST /api/auth/register
 * Inscription d'un nouveau médecin
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validation avec Zod
    const input = registerSchema.parse(req.body);

    // Inscription
    const medecin = await authService.register(input);

    res.status(201).json({
      message: 'Inscription réussie',
      medecin,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ApiError(
        'Données invalides',
        'VALIDATION_ERROR',
        422,
        error.errors
      ));
    }
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Connexion d'un médecin
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validation avec Zod
    const input = loginSchema.parse(req.body);

    // Connexion
    const { accessToken, refreshToken, medecin } = await authService.login(input);

    // Supprimer l'ancien cookie s'il existe (avec l'ancien path)
    res.clearCookie('refresh_token', { path: '/api/auth' });
    
    // Définir le cookie refresh token avec le nouveau path
    const isProduction = env.nodeEnv === 'production';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/api', // Accessible depuis toutes les routes API
      maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000, // en millisecondes
    });

    res.status(200).json({
      accessToken,
      medecin,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ApiError(
        'Données invalides',
        'VALIDATION_ERROR',
        422,
        error.errors
      ));
    }
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Rafraîchir l'access token avec le refresh token
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new ApiError('Refresh token manquant', 'AUTH_REFRESH_TOKEN_MISSING', 401);
    }

    // Rafraîchir les tokens
    const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);

    // Définir le nouveau cookie refresh token
    const isProduction = env.nodeEnv === 'production';
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/api', // Accessible depuis toutes les routes API
      maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      accessToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Déconnexion (révoque la session)
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refresh_token;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Supprimer le cookie
    res.clearCookie('refresh_token', {
      path: '/api',
    });

    res.status(204).send();
  } catch (error) {
    // Même en cas d'erreur, on supprime le cookie
    res.clearCookie('refresh_token', {
      path: '/api',
    });
    res.status(204).send();
  }
});

/**
 * GET /api/auth/me
 * Récupère les informations du médecin connecté (protégé)
 */
router.get('/me', verifyAccessToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError('Non authentifié', 'AUTH_UNAUTHORIZED', 401);
    }

    const medecin = await authService.getMe(req.user.medecinId);

    res.status(200).json(medecin);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/auth/password
 * Change le mot de passe du médecin connecté (protégé)
 */
router.patch('/password', verifyAccessToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError('Non authentifié', 'AUTH_UNAUTHORIZED', 401);
    }

    // Validation avec Zod
    const input = changePasswordSchema.parse(req.body);

    // Changer le mot de passe
    const result = await authService.changePassword(req.user.medecinId, input);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ApiError(
        'Données invalides',
        'VALIDATION_ERROR',
        422,
        error.errors
      ));
    }
    next(error);
  }
});

/**
 * PATCH /api/auth/me
 * Modifie le profil du médecin connecté (protégé)
 */
router.patch('/me', verifyAccessToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError('Non authentifié', 'AUTH_UNAUTHORIZED', 401);
    }

    // Validation avec Zod
    const input = updateProfileSchema.parse(req.body);

    // Mettre à jour le profil
    const medecin = await authService.updateProfile(req.user.medecinId, input);

    res.status(200).json(medecin);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ApiError(
        'Données invalides',
        'VALIDATION_ERROR',
        422,
        error.errors
      ));
    }
    next(error);
  }
});

export default router;

