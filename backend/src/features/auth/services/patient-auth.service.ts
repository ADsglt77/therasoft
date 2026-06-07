import jwt from 'jsonwebtoken';
import { prisma } from '../../../lib/prisma';
import { env } from '../../../config/env';
import { ApiError } from '../../../middlewares/errorHandler';
import { authService } from './auth.service';
import { addressService } from './address.service';
import { sendMail, logoAttachment } from '../../../lib/mailer';
import { verificationEmail } from '../../../lib/email-templates';
import { PatientRegisterInput, LoginInput, ChangePasswordInput, UpdateProfileInput } from '../schemas/auth.schemas';

const patientSelect = {
  id: true,
  email: true,
  nom: true,
  prenom: true,
  adresse: true,
  emailVerified: true,
  medecin: { select: { id: true, nom: true, prenom: true, specialite: true } },
} as const;

/**
 * Authentification des patients (principal parallèle au médecin).
 * Réutilise le hachage Argon2 et les sessions rotatives ; ne touche pas
 * à l'auth médecin (AuthSession.patientId au lieu de medecinId).
 */
export class PatientAuthService {
  generateAccessToken(patientId: number): string {
    return jwt.sign({ patientId, role: 'PATIENT' }, env.jwtAccessSecret, {
      expiresIn: `${env.accessTokenTtlMinutes}m`,
    });
  }

  generateRefreshToken(patientId: number, sessionId: number): string {
    return jwt.sign({ patientId, sessionId, type: 'refresh' }, env.jwtRefreshSecret, {
      expiresIn: `${env.refreshTokenTtlDays}d`,
    });
  }

  verifyRefreshToken(token: string): { patientId: number; sessionId: number } {
    try {
      const decoded = jwt.verify(token, env.jwtRefreshSecret) as {
        patientId?: number;
        sessionId?: number;
        type?: string;
      };
      if (decoded.type !== 'refresh' || !decoded.sessionId || !decoded.patientId) {
        throw new ApiError('Token invalide', 'AUTH_INVALID_TOKEN', 401);
      }
      return { patientId: decoded.patientId, sessionId: decoded.sessionId };
    } catch {
      throw new ApiError('Token invalide ou expiré', 'AUTH_INVALID_TOKEN', 401);
    }
  }

  /**
   * Auto-inscription : crée le compte patient rattaché au médecin choisi, puis connecte.
   */
  async registerPatient(input: PatientRegisterInput) {
    const existing = await prisma.patient.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ApiError('Cet email est déjà utilisé', 'AUTH_EMAIL_EXISTS', 409);
    }

    const medecin = await prisma.medecin.findFirst({
      where: { id: input.medecinId, isActive: true, role: 'MEDECIN' },
      select: { id: true },
    });
    if (!medecin) {
      throw new ApiError('Médecin introuvable', 'AUTH_MEDECIN_NOT_FOUND', 404);
    }

    // Vérification de l'adresse : on stocke la version normalisée + les coordonnées
    // renvoyées par le service officiel (concordance des données, tri par distance).
    const geo = await addressService.geocode(input.adresse);
    if (!geo) {
      throw new ApiError('Adresse introuvable, choisissez une suggestion proposée', 'AUTH_ADDRESS_NOT_FOUND', 400);
    }

    const passwordHash = await authService.hashPassword(input.password);
    const created = await prisma.patient.create({
      data: {
        nom: input.nom,
        prenom: input.prenom,
        email: input.email,
        passwordHash,
        medecinId: input.medecinId,
        adresse: geo.label,
        latitude: geo.latitude,
        longitude: geo.longitude,
      },
      select: { id: true, email: true, prenom: true },
    });

    // Email de vérification (ne bloque pas l'inscription si l'envoi échoue).
    await this.sendVerificationEmail({ id: created.id, email: input.email, prenom: created.prenom }).catch((err) =>
      console.error("Échec de l'envoi de l'email de vérification :", err)
    );

    return this.login({ email: input.email, password: input.password });
  }

  async login(input: LoginInput) {
    const patient = await prisma.patient.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        nom: true,
        prenom: true,
        passwordHash: true,
        emailVerified: true,
        medecin: { select: { id: true, nom: true, prenom: true, specialite: true } },
      },
    });

    // Message générique (anti-énumération) ; null aussi pour les fiches sans compte.
    if (!patient || !patient.passwordHash) {
      throw new ApiError('Identifiants invalides', 'AUTH_INVALID_CREDENTIALS', 401);
    }

    const isPasswordValid = await authService.verifyPassword(patient.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new ApiError('Identifiants invalides', 'AUTH_INVALID_CREDENTIALS', 401);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.refreshTokenTtlDays);

    const session = await prisma.authSession.create({
      data: { patientId: patient.id, refreshTokenHash: '', expiresAt },
    });

    const accessToken = this.generateAccessToken(patient.id);
    const refreshToken = this.generateRefreshToken(patient.id, session.id);
    const refreshTokenHash = await authService.hashRefreshToken(refreshToken);

    await prisma.authSession.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      patient: {
        id: patient.id,
        nom: patient.nom,
        prenom: patient.prenom,
        role: 'PATIENT' as const,
        emailVerified: patient.emailVerified,
        medecin: patient.medecin,
      },
    };
  }

  async refresh(refreshToken: string) {
    const { patientId, sessionId } = this.verifyRefreshToken(refreshToken);

    const session = await prisma.authSession.findUnique({ where: { id: sessionId } });
    if (!session || session.patientId !== patientId) {
      throw new ApiError('Session invalide', 'AUTH_INVALID_SESSION', 401);
    }
    if (session.expiresAt < new Date()) {
      throw new ApiError('Session expirée', 'AUTH_SESSION_EXPIRED', 401);
    }
    if (session.revokedAt) {
      throw new ApiError('Session révoquée', 'AUTH_SESSION_REVOKED', 401);
    }

    const isTokenValid = await authService.verifyRefreshTokenHash(session.refreshTokenHash, refreshToken);
    if (!isTokenValid) {
      throw new ApiError('Token invalide', 'AUTH_INVALID_TOKEN', 401);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.refreshTokenTtlDays);

    const newSession = await prisma.authSession.create({
      data: { patientId, refreshTokenHash: '', expiresAt },
    });
    const newRefreshToken = this.generateRefreshToken(patientId, newSession.id);
    const newRefreshTokenHash = await authService.hashRefreshToken(newRefreshToken);

    await prisma.$transaction([
      prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
      prisma.authSession.update({
        where: { id: newSession.id },
        data: { refreshTokenHash: newRefreshTokenHash },
      }),
    ]);

    return {
      accessToken: this.generateAccessToken(patientId),
      refreshToken: newRefreshToken,
    };
  }

  async getMe(patientId: number) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: patientSelect,
    });
    if (!patient) {
      throw new ApiError('Patient introuvable', 'AUTH_PATIENT_NOT_FOUND', 404);
    }
    return { ...patient, role: 'PATIENT' as const };
  }

  // ---- Vérification de l'email ----

  private generateVerifyToken(patientId: number): string {
    return jwt.sign({ patientId, purpose: 'verify-email' }, env.jwtAccessSecret, { expiresIn: '1d' });
  }

  /** Envoie l'email de vérification (lien valable 24 h). */
  async sendVerificationEmail(patient: { id: number; email: string; prenom: string }): Promise<void> {
    const token = this.generateVerifyToken(patient.id);
    const link = `${env.appUrl}/verifier-email?token=${token}`;
    const { subject, html, text } = verificationEmail({ prenom: patient.prenom, link });
    await sendMail({ to: patient.email, subject, html, text, attachments: logoAttachment() });
  }

  /** Vérifie le jeton reçu par email et marque l'adresse comme vérifiée. */
  async verifyEmail(token: string): Promise<void> {
    let payload: { patientId?: number; purpose?: string };
    try {
      payload = jwt.verify(token, env.jwtAccessSecret) as { patientId?: number; purpose?: string };
    } catch {
      throw new ApiError('Lien de vérification invalide ou expiré', 'AUTH_VERIFY_TOKEN_INVALID', 400);
    }
    if (payload.purpose !== 'verify-email' || !payload.patientId) {
      throw new ApiError('Lien de vérification invalide', 'AUTH_VERIFY_TOKEN_INVALID', 400);
    }
    await prisma.patient.update({ where: { id: payload.patientId }, data: { emailVerified: true } });
  }

  /** Renvoie l'email de vérification au patient connecté (no-op si déjà vérifié). */
  async resendVerification(patientId: number): Promise<void> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, email: true, prenom: true, emailVerified: true },
    });
    if (!patient || !patient.email) {
      throw new ApiError('Patient introuvable', 'AUTH_PATIENT_NOT_FOUND', 404);
    }
    if (patient.emailVerified) {
      return;
    }
    await this.sendVerificationEmail({ id: patient.id, email: patient.email, prenom: patient.prenom });
  }

  /** Modifie le profil (nom / prénom) du patient connecté. */
  async updateProfile(patientId: number, input: UpdateProfileInput) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
    if (!patient) {
      throw new ApiError('Patient introuvable', 'AUTH_PATIENT_NOT_FOUND', 404);
    }

    const updateData: { nom?: string; prenom?: string } = {};
    if (input.nom !== undefined) {
      updateData.nom = input.nom;
    }
    if (input.prenom !== undefined) {
      updateData.prenom = input.prenom;
    }
    if (Object.keys(updateData).length === 0) {
      throw new ApiError('Aucune donnée à mettre à jour', 'VALIDATION_ERROR', 400);
    }

    await prisma.patient.update({ where: { id: patientId }, data: updateData });
    return this.getMe(patientId);
  }

  /** Change le mot de passe du patient connecté (et révoque ses sessions actives). */
  async changePassword(patientId: number, input: ChangePasswordInput) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, passwordHash: true },
    });
    if (!patient || !patient.passwordHash) {
      throw new ApiError('Patient introuvable', 'AUTH_PATIENT_NOT_FOUND', 404);
    }

    const isCurrentPasswordValid = await authService.verifyPassword(patient.passwordHash, input.currentPassword);
    if (!isCurrentPasswordValid) {
      throw new ApiError('Mot de passe actuel incorrect', 'AUTH_INVALID_PASSWORD', 401);
    }
    if (input.currentPassword === input.newPassword) {
      throw new ApiError("Le nouveau mot de passe doit être différent de l'ancien", 'AUTH_SAME_PASSWORD', 400);
    }

    const newPasswordHash = await authService.hashPassword(input.newPassword);
    await prisma.$transaction([
      prisma.patient.update({ where: { id: patientId }, data: { passwordHash: newPasswordHash } }),
      prisma.authSession.updateMany({ where: { patientId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    return { message: 'Mot de passe modifié avec succès' };
  }
}

export const patientAuthService = new PatientAuthService();
