import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { registerSchema, loginSchema, changePasswordSchema, updateProfileSchema, updateAvatarSchema } from '../schemas/auth.schemas';
import { verifyAccessToken } from '../middlewares/jwt.middleware';
import { ApiError } from '../../../middlewares/errorHandler';
import { validateBody } from '../../../middlewares/validate';
import { authRateLimiter } from '../../../middlewares/rateLimiter';
import { env } from '../../../config/env';

const router = Router();

/**
 * POST /api/auth/register
 * Inscription d'un nouveau médecin
 */
router.post('/register', authRateLimiter, validateBody(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!env.allowPublicRegister) {
      throw new ApiError('Inscription désactivée', 'AUTH_REGISTER_DISABLED', 403);
    }

    const medecin = await authService.register(req.body);

    res.status(201).json({
      message: 'Inscription réussie',
      medecin,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Connexion d'un médecin
 */
router.post('/login', authRateLimiter, validateBody(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessToken, refreshToken, medecin } = await authService.login(req.body);

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
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Rafraîchir l'access token avec le refresh token
 */
router.post('/refresh', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
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

    clearRefreshTokenCookie(res);

    res.status(204).send();
  } catch (error) {
    // Même en cas d'erreur, on supprime le cookie
    clearRefreshTokenCookie(res);
    res.status(204).send();
  }
});

function clearRefreshTokenCookie(res: Response): void {
  const isProduction = env.nodeEnv === 'production';
  const base = { httpOnly: true, secure: isProduction, sameSite: 'lax' as const };
  res.clearCookie('refresh_token', { ...base, path: '/api' });
  res.clearCookie('refresh_token', { ...base, path: '/api/auth' });
}

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
router.patch('/password', verifyAccessToken, validateBody(changePasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError('Non authentifié', 'AUTH_UNAUTHORIZED', 401);
    }

    const result = await authService.changePassword(req.user.medecinId, req.body);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/auth/me
 * Modifie le profil du médecin connecté (protégé)
 */
router.patch('/me', verifyAccessToken, validateBody(updateProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError('Non authentifié', 'AUTH_UNAUTHORIZED', 401);
    }

    const medecin = await authService.updateProfile(req.user.medecinId, req.body);

    res.status(200).json(medecin);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/auth/avatar
 * Met à jour l'avatar du médecin connecté (protégé)
 */
router.patch('/avatar', verifyAccessToken, validateBody(updateAvatarSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError('Non authentifié', 'AUTH_UNAUTHORIZED', 401);
    }

    const medecin = await authService.updateAvatar(req.user.medecinId, req.body);

    res.status(200).json(medecin);
  } catch (error) {
    next(error);
  }
});

export default router;

