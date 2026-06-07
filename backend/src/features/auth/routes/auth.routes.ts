import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { patientAuthService } from '../services/patient-auth.service';
import {
  registerSchema,
  loginSchema,
  patientRegisterSchema,
  changePasswordSchema,
  updateProfileSchema,
  updateAvatarSchema,
  addressSearchSchema,
  AddressSearchQuery,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth.schemas';
import { addressService } from '../services/address.service';
import { emailBaseUrl } from '../../../lib/request-url';
import { verifyAccessToken, verifyPatientAccessToken } from '../../../middlewares/jwt.middleware';
import { requireMedecinId, requirePatientId } from '../../../middlewares/requireMedecin';
import { ApiError } from '../../../middlewares/errorHandler';
import { validateBody, validateQuery } from '../../../middlewares/validate';
import { authRateLimiter } from '../../../middlewares/rateLimiter';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { env } from '../../../config/env';
import { prisma } from '../../../lib/prisma';
import { clearRefreshTokenCookie } from '../auth.cookies';
import { applySetCookieHeaders, getBetterAuth, requestHeaders } from '../../../lib/better-auth';

const router = Router();

type SessionUser = {
  id: string;
  role: string;
  profileType: string;
  profileId: number;
  email: string;
  emailVerified: boolean;
};

async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const auth = await getBetterAuth();
  const session = await auth.api.getSession({ headers: requestHeaders(req), query: { disableRefresh: false } });
  if (!session) {
    return null;
  }
  return session.user as SessionUser;
}

async function signInWithBetterAuth(req: Request, res: Response, body: { email: string; password: string }) {
  const auth = await getBetterAuth();
  const response = await auth.api.signInEmail({
    body,
    headers: requestHeaders(req),
    asResponse: true,
  });
  applySetCookieHeaders(res, response.headers);
  if (!response.ok) {
    throw new ApiError('Identifiants invalides', 'AUTH_INVALID_CREDENTIALS', 401);
  }
}

async function ensureBetterAuthUser(
  req: Request,
  body: { email: string; password: string; name: string; role: string; profileType: string; profileId: number }
) {
  const auth = await getBetterAuth();
  const response = await auth.api.signUpEmail({
    body,
    headers: requestHeaders(req),
    asResponse: true,
  });
  if (!response.ok && response.status !== 409) {
    throw new ApiError('Impossible de migrer le compte vers Better Auth', 'AUTH_MIGRATION_FAILED', 500);
  }
}

async function mapSessionUserToApiUser(user: SessionUser) {
  if (user.profileType === 'PATIENT') {
    const patient = await patientAuthService.getMe(user.profileId);
    return { ...patient, emailVerified: user.emailVerified, role: 'PATIENT' as const };
  }
  const medecin = await authService.getMe(user.profileId);
  return { ...medecin, role: user.role };
}

router.post(
  '/register',
  authRateLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!env.allowPublicRegister) {
      throw new ApiError('Inscription désactivée', 'AUTH_REGISTER_DISABLED', 403);
    }
    const medecin = await authService.register(req.body);
    await ensureBetterAuthUser(req, {
      email: req.body.email,
      password: req.body.password,
      name: `${req.body.prenom} ${req.body.nom}`.trim(),
      role: medecin.role,
      profileType: 'MEDECIN',
      profileId: medecin.id,
    });
    await signInWithBetterAuth(req, res, { email: req.body.email, password: req.body.password });
    const user = await getSessionUser(req);
    res.status(201).json({ role: medecin.role, user: user ? await mapSessionUserToApiUser(user) : medecin });
  })
);

router.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      await signInWithBetterAuth(req, res, req.body);
      const user = await getSessionUser(req);
      if (!user) {
        throw new ApiError('Session introuvable', 'AUTH_UNAUTHORIZED', 401);
      }
      res.status(200).json({ role: user.role, user: await mapSessionUserToApiUser(user) });
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== 'AUTH_INVALID_CREDENTIALS') {
        throw error;
      }

      // Migration automatique des comptes legacy vers Better Auth.
      try {
        const { medecin } = await authService.login(req.body);
        await ensureBetterAuthUser(req, {
          email: req.body.email,
          password: req.body.password,
          name: `${medecin.prenom} ${medecin.nom}`.trim(),
          role: medecin.role,
          profileType: 'MEDECIN',
          profileId: medecin.id,
        });
      } catch (legacyMedecinError) {
        if (!(legacyMedecinError instanceof ApiError) || legacyMedecinError.code !== 'AUTH_INVALID_CREDENTIALS') {
          throw legacyMedecinError;
        }
        const { patient } = await patientAuthService.login(req.body);
        await ensureBetterAuthUser(req, {
          email: req.body.email,
          password: req.body.password,
          name: `${patient.prenom} ${patient.nom}`.trim(),
          role: 'PATIENT',
          profileType: 'PATIENT',
          profileId: patient.id,
        });
      }

      await signInWithBetterAuth(req, res, req.body);
      const user = await getSessionUser(req);
      if (!user) {
        throw new ApiError('Session introuvable', 'AUTH_UNAUTHORIZED', 401);
      }
      res.status(200).json({ role: user.role, user: await mapSessionUserToApiUser(user) });
    }
  })
);

router.post(
  '/refresh',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await getSessionUser(req);
    if (!user) {
      throw new ApiError('Session expirée', 'AUTH_UNAUTHORIZED', 401);
    }
    res.status(200).json({ accessToken: '', role: user.role, user: await mapSessionUserToApiUser(user) });
  })
);

router.post(
  '/forgot-password',
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const auth = await getBetterAuth();
    await auth.api.requestPasswordReset({
      body: { email: req.body.email, redirectTo: `${emailBaseUrl(req)}/reinitialiser-mot-de-passe` },
      headers: requestHeaders(req),
    });
    // Réponse identique que l'email existe ou non (anti-énumération).
    res.status(200).json({ message: 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.' });
  })
);

router.post(
  '/reset-password',
  authRateLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const auth = await getBetterAuth();
    await auth.api.resetPassword({
      body: { token: req.body.token, newPassword: req.body.newPassword },
      headers: requestHeaders(req),
    });
    res.status(200).json({ message: 'Mot de passe réinitialisé' });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const auth = await getBetterAuth();
    const signOutResponse = await auth.api.signOut({
      headers: requestHeaders(req),
      asResponse: true,
    });
    applySetCookieHeaders(res, signOutResponse.headers);
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
    const auth = await getBetterAuth();
    await auth.api.changePassword({ body: req.body, headers: requestHeaders(req) });
    res.status(200).json({ message: 'Mot de passe modifié avec succès' });
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

// ---- Patient (auto-inscription + portail de réservation) ----

router.get(
  '/address/search',
  validateQuery(addressSearchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query as unknown as AddressSearchQuery;
    res.json({ suggestions: await addressService.search(q) });
  })
);

router.get(
  '/medecins',
  asyncHandler(async (_req: Request, res: Response) => {
    const medecins = await prisma.medecin.findMany({
      where: { isActive: true, role: 'MEDECIN' },
      select: { id: true, nom: true, prenom: true, specialite: true },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });
    res.status(200).json({ medecins });
  })
);

router.post(
  '/patient/register',
  authRateLimiter,
  validateBody(patientRegisterSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { patient } = await patientAuthService.registerPatient(req.body, emailBaseUrl(req));
    await ensureBetterAuthUser(req, {
      email: req.body.email,
      password: req.body.password,
      name: `${patient.prenom} ${patient.nom}`.trim(),
      role: 'PATIENT',
      profileType: 'PATIENT',
      profileId: patient.id,
    });
    await signInWithBetterAuth(req, res, { email: req.body.email, password: req.body.password });
    const user = await getSessionUser(req);
    res.status(201).json({ role: 'PATIENT', user: user ? await mapSessionUserToApiUser(user) : patient });
  })
);

router.get(
  '/patient/me',
  verifyPatientAccessToken,
  asyncHandler(async (req: Request, res: Response) => {
    const patient = await patientAuthService.getMe(requirePatientId(req));
    const user = await getSessionUser(req);
    res.status(200).json({ ...patient, emailVerified: user?.emailVerified ?? patient.emailVerified });
  })
);

router.post(
  '/verify-email',
  validateBody(verifyEmailSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const auth = await getBetterAuth();
    await auth.api.verifyEmail({
      query: { token: req.body.token, callbackURL: `${emailBaseUrl(req)}/verifier-email` },
      headers: requestHeaders(req),
    });
    res.status(200).json({ message: 'Adresse email vérifiée' });
  })
);

router.post(
  '/patient/resend-verification',
  verifyPatientAccessToken,
  asyncHandler(async (req: Request, res: Response) => {
    const auth = await getBetterAuth();
    const patient = await patientAuthService.getMe(requirePatientId(req));
    if (patient.email) {
      await auth.api.sendVerificationEmail({
        body: { email: patient.email, callbackURL: `${emailBaseUrl(req)}/verifier-email` },
        headers: requestHeaders(req),
      });
    }
    res.status(200).json({ message: 'Email de vérification renvoyé' });
  })
);

router.patch(
  '/patient/me',
  verifyPatientAccessToken,
  validateBody(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const patient = await patientAuthService.updateProfile(requirePatientId(req), req.body);
    res.status(200).json(patient);
  })
);

router.patch(
  '/patient/password',
  verifyPatientAccessToken,
  validateBody(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const auth = await getBetterAuth();
    await auth.api.changePassword({ body: req.body, headers: requestHeaders(req) });
    res.status(200).json({ message: 'Mot de passe modifié avec succès' });
  })
);

export default router;
