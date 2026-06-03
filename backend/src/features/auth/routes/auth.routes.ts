import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  updateAvatarSchema,
} from '../schemas/auth.schemas';
import { verifyAccessToken } from '../../../middlewares/jwt.middleware';
import { requireMedecinId } from '../../../middlewares/requireMedecin';
import { ApiError } from '../../../middlewares/errorHandler';
import { validateBody } from '../../../middlewares/validate';
import { authRateLimiter } from '../../../middlewares/rateLimiter';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { env } from '../../../config/env';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../auth.cookies';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!env.allowPublicRegister) {
      throw new ApiError('Inscription désactivée', 'AUTH_REGISTER_DISABLED', 403);
    }
    const medecin = await authService.register(req.body);
    res.status(201).json({ message: 'Inscription réussie', medecin });
  })
);

router.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { accessToken, refreshToken, medecin } = await authService.login(req.body);
    setRefreshTokenCookie(res, refreshToken);
    res.status(200).json({ accessToken, medecin });
  })
);

router.post(
  '/refresh',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new ApiError('Refresh token manquant', 'AUTH_REFRESH_TOKEN_MISSING', 401);
    }
    const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);
    setRefreshTokenCookie(res, newRefreshToken);
    res.status(200).json({ accessToken });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        // Toujours effacer le cookie côté client
      }
    }
    clearRefreshTokenCookie(res);
    res.status(204).send();
  })
);

router.get(
  '/me',
  verifyAccessToken,
  asyncHandler(async (req: Request, res: Response) => {
    const medecin = await authService.getMe(requireMedecinId(req));
    res.status(200).json(medecin);
  })
);

router.patch(
  '/password',
  verifyAccessToken,
  validateBody(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.changePassword(requireMedecinId(req), req.body);
    res.status(200).json(result);
  })
);

router.patch(
  '/me',
  verifyAccessToken,
  validateBody(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecin = await authService.updateProfile(requireMedecinId(req), req.body);
    res.status(200).json(medecin);
  })
);

router.patch(
  '/avatar',
  verifyAccessToken,
  validateBody(updateAvatarSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const medecin = await authService.updateAvatar(requireMedecinId(req), req.body);
    res.status(200).json(medecin);
  })
);

export default router;
