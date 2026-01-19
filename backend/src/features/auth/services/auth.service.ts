import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../lib/prisma';
import { env } from '../../../config/env';
import { RegisterInput, LoginInput, ChangePasswordInput, UpdateProfileInput, UpdateAvatarInput } from '../schemas/auth.schemas';
import { ApiError } from '../../../middlewares/errorHandler';

/**
 * Service d'authentification
 */
export class AuthService {
  /**
   * Hash un mot de passe avec Argon2id
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });
  }

  /**
   * Vérifie un mot de passe avec Argon2id
   */
  async verifyPassword(hashedPassword: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hashedPassword, password);
    } catch {
      return false;
    }
  }

  /**
   * Génère un access token JWT
   */
  generateAccessToken(medecinId: number, role: string): string {
    return jwt.sign(
      { medecinId, role },
      env.jwtAccessSecret,
      { expiresIn: `${env.accessTokenTtlMinutes}m` }
    );
  }

  /**
   * Génère un refresh token JWT avec sessionId
   */
  generateRefreshToken(medecinId: number, sessionId: number): string {
    return jwt.sign(
      { medecinId, sessionId, type: 'refresh' },
      env.jwtRefreshSecret,
      { expiresIn: `${env.refreshTokenTtlDays}d` }
    );
  }

  /**
   * Vérifie et décode un access token
   */
  verifyAccessToken(token: string): { medecinId: number; role: string } {
    try {
      const decoded = jwt.verify(token, env.jwtAccessSecret) as { medecinId: number; role: string };
      return decoded;
    } catch {
      throw new ApiError('Token invalide ou expiré', 'AUTH_INVALID_TOKEN', 401);
    }
  }

  /**
   * Vérifie et décode un refresh token
   */
  verifyRefreshToken(token: string): { medecinId: number; sessionId: number } {
    try {
      const decoded = jwt.verify(token, env.jwtRefreshSecret) as { medecinId: number; sessionId: number; type: string };
      if (decoded.type !== 'refresh' || !decoded.sessionId) {
        throw new ApiError('Token invalide', 'AUTH_INVALID_TOKEN', 401);
      }
      return { medecinId: decoded.medecinId, sessionId: decoded.sessionId };
    } catch {
      throw new ApiError('Token invalide ou expiré', 'AUTH_INVALID_TOKEN', 401);
    }
  }

  /**
   * Hash un refresh token pour stockage en DB
   */
  async hashRefreshToken(token: string): Promise<string> {
    return this.hashPassword(token); // Réutilise Argon2 pour hasher le token
  }

  /**
   * Vérifie un refresh token hashé
   */
  async verifyRefreshTokenHash(hashedToken: string, token: string): Promise<boolean> {
    return this.verifyPassword(hashedToken, token);
  }

  /**
   * Inscription d'un nouveau médecin
   */
  async register(input: RegisterInput) {
    // Vérifier si l'email existe déjà
    const existingMedecin = await prisma.medecin.findUnique({
      where: { email: input.email },
    });

    if (existingMedecin) {
      throw new ApiError('Cet email est déjà utilisé', 'AUTH_EMAIL_EXISTS', 409);
    }

    // Hasher le mot de passe
    const passwordHash = await this.hashPassword(input.password);

    // Créer le médecin
    const medecin = await prisma.medecin.create({
      data: {
        email: input.email,
        passwordHash,
        nom: input.nom,
        prenom: input.prenom,
        role: 'MEDECIN',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        // @ts-expect-error - avatarUrl et avatarFileName existent dans le schéma Prisma mais les types ne sont pas synchronisés localement
        avatarUrl: true,
        avatarFileName: true,
      },
    });

    if (!medecin) {
      throw new ApiError('Médecin introuvable', 'AUTH_MEDECIN_NOT_FOUND', 404);
    }

    return medecin;
  }

  /**
   * Connexion d'un médecin
   */
  async login(input: LoginInput) {
    // Trouver le médecin par email
    const medecin = await prisma.medecin.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        passwordHash: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        // @ts-expect-error - avatarUrl et avatarFileName existent dans le schéma Prisma mais les types ne sont pas synchronisés localement
        avatarUrl: true,
        avatarFileName: true,
      },
    });

    if (!medecin) {
      throw new ApiError('Aucun compte trouvé avec cet email', 'AUTH_EMAIL_NOT_FOUND', 401);
    }

    // Vérifier si le compte est actif
    if (!medecin.isActive) {
      throw new ApiError('Votre compte est désactivé. Veuillez contacter l\'administrateur', 'AUTH_ACCOUNT_INACTIVE', 403);
    }

    // Vérifier le mot de passe
    const isPasswordValid = await this.verifyPassword(medecin.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new ApiError('Mot de passe incorrect', 'AUTH_INVALID_PASSWORD', 401);
    }

    // Mettre à jour lastLoginAt
    await prisma.medecin.update({
      where: { id: medecin.id },
      data: { lastLoginAt: new Date() },
    });

    // Calculer la date d'expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.refreshTokenTtlDays);

    // Créer la session d'abord (pour avoir l'ID)
    const session = await prisma.authSession.create({
      data: {
        medecinId: medecin.id,
        refreshTokenHash: '', // Temporaire, sera mis à jour
        expiresAt,
      },
    });

    // Générer les tokens (avec sessionId dans le refresh token)
    const accessToken = this.generateAccessToken(medecin.id, medecin.role);
    const refreshToken = this.generateRefreshToken(medecin.id, session.id);

    // Hasher le refresh token pour stockage
    const refreshTokenHash = await this.hashRefreshToken(refreshToken);

    // Mettre à jour la session avec le hash
    await prisma.authSession.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      medecin: {
        id: medecin.id,
        nom: medecin.nom,
        prenom: medecin.prenom,
        role: medecin.role,
        avatarUrl: (medecin as any).avatarUrl ?? null,
        avatarFileName: (medecin as any).avatarFileName ?? null,
      },
    };
  }

  /**
   * Rafraîchir l'access token avec un refresh token
   */
  async refresh(refreshToken: string) {
    // Vérifier le refresh token et extraire sessionId
    const { medecinId, sessionId } = this.verifyRefreshToken(refreshToken);

    // Trouver la session par ID
    const session = await prisma.authSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ApiError('Session introuvable', 'AUTH_INVALID_SESSION', 401);
    }

    // Vérifier que la session appartient au bon médecin
    if (session.medecinId !== medecinId) {
      throw new ApiError('Session invalide', 'AUTH_INVALID_SESSION', 401);
    }

    // Vérifier que la session n'est pas expirée
    if (session.expiresAt < new Date()) {
      throw new ApiError('Session expirée', 'AUTH_SESSION_EXPIRED', 401);
    }

    // Vérifier que la session n'est pas révoquée
    if (session.revokedAt) {
      throw new ApiError('Session révoquée', 'AUTH_SESSION_REVOKED', 401);
    }

    // Vérifier que le hash du token correspond
    const isTokenValid = await this.verifyRefreshTokenHash(session.refreshTokenHash, refreshToken);
    if (!isTokenValid) {
      throw new ApiError('Token invalide', 'AUTH_INVALID_TOKEN', 401);
    }

    // Récupérer le médecin
    const medecin = await prisma.medecin.findUnique({
      where: { id: medecinId },
      select: { id: true, role: true, isActive: true },
    });

    if (!medecin || !medecin.isActive) {
      throw new ApiError('Compte invalide ou désactivé', 'AUTH_ACCOUNT_INVALID', 401);
    }

    // Rotation: révoquer l'ancienne session
    await prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    // Calculer la nouvelle date d'expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.refreshTokenTtlDays);

    // Créer une nouvelle session d'abord
    const newSession = await prisma.authSession.create({
      data: {
        medecinId,
        refreshTokenHash: '', // Temporaire
        expiresAt,
      },
    });

    // Générer un nouveau refresh token avec le nouveau sessionId
    const newRefreshToken = this.generateRefreshToken(medecinId, newSession.id);
    const newRefreshTokenHash = await this.hashRefreshToken(newRefreshToken);

    // Mettre à jour la session avec le hash
    await prisma.authSession.update({
      where: { id: newSession.id },
      data: { refreshTokenHash: newRefreshTokenHash },
    });

    // Générer un nouvel access token
    const accessToken = this.generateAccessToken(medecin.id, medecin.role);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Déconnexion (révoque la session)
   */
  async logout(refreshToken: string) {
    try {
      const { sessionId } = this.verifyRefreshToken(refreshToken);

      // Trouver et révoquer la session
      const session = await prisma.authSession.findUnique({
        where: { id: sessionId },
      });

      if (session && !session.revokedAt) {
        // Vérifier que le hash correspond
        const isTokenValid = await this.verifyRefreshTokenHash(session.refreshTokenHash, refreshToken);
        if (isTokenValid) {
          await prisma.authSession.update({
            where: { id: session.id },
            data: { revokedAt: new Date() },
          });
        }
      }
    } catch {
      // Ignorer les erreurs de token invalide lors du logout
    }
  }

  /**
   * Récupère les informations du médecin connecté
   */
  async getMe(medecinId: number) {
    const medecin = await prisma.medecin.findUnique({
      where: { id: medecinId },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        // @ts-expect-error - avatarUrl et avatarFileName existent dans le schéma Prisma mais les types ne sont pas synchronisés localement
        avatarUrl: true,
        avatarFileName: true,
      },
    });

    if (!medecin) {
      throw new ApiError('Médecin introuvable', 'AUTH_MEDECIN_NOT_FOUND', 404);
    }

    return medecin;
  }

  /**
   * Change le mot de passe du médecin connecté
   */
  async changePassword(medecinId: number, input: ChangePasswordInput) {
    // Récupérer le médecin avec le mot de passe hashé
    const medecin = await prisma.medecin.findUnique({
      where: { id: medecinId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!medecin) {
      throw new ApiError('Médecin introuvable', 'AUTH_MEDECIN_NOT_FOUND', 404);
    }

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await this.verifyPassword(medecin.passwordHash, input.currentPassword);
    if (!isCurrentPasswordValid) {
      throw new ApiError('Mot de passe actuel incorrect', 'AUTH_INVALID_PASSWORD', 401);
    }

    // Vérifier que le nouveau mot de passe est différent
    if (input.currentPassword === input.newPassword) {
      throw new ApiError('Le nouveau mot de passe doit être différent de l\'ancien', 'AUTH_SAME_PASSWORD', 400);
    }

    // Hasher le nouveau mot de passe
    const newPasswordHash = await this.hashPassword(input.newPassword);

    // Mettre à jour le mot de passe
    await prisma.medecin.update({
      where: { id: medecinId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return { message: 'Mot de passe modifié avec succès' };
  }

  /**
   * Modifie le profil du médecin connecté
   */
  async updateProfile(medecinId: number, input: UpdateProfileInput) {
    // Vérifier que le médecin existe
    const medecin = await prisma.medecin.findUnique({
      where: { id: medecinId },
    });

    if (!medecin) {
      throw new ApiError('Médecin introuvable', 'AUTH_MEDECIN_NOT_FOUND', 404);
    }

    // Préparer les données à mettre à jour (seulement les champs fournis)
    const updateData: { nom?: string; prenom?: string; avatarUrl?: string | null } = {};
    if (input.nom !== undefined) {
      updateData.nom = input.nom;
    }
    if (input.prenom !== undefined) {
      updateData.prenom = input.prenom;
    }

    // Vérifier qu'au moins un champ est fourni
    if (Object.keys(updateData).length === 0) {
      throw new ApiError('Aucune donnée à mettre à jour', 'VALIDATION_ERROR', 400);
    }

    // Mettre à jour le profil
    const updatedMedecin = await prisma.medecin.update({
      where: { id: medecinId },
      data: updateData,
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        // @ts-expect-error - avatarUrl et avatarFileName existent dans le schéma Prisma mais les types ne sont pas synchronisés localement
        avatarUrl: true,
        avatarFileName: true,
      },
    });

    return updatedMedecin;
  }

  /**
   * Met à jour l'avatar du médecin connecté
   */
  async updateAvatar(medecinId: number, input: UpdateAvatarInput) {
    // Vérifier que le médecin existe
    const medecin = await prisma.medecin.findUnique({
      where: { id: medecinId },
    });

    if (!medecin) {
      throw new ApiError('Médecin introuvable', 'AUTH_MEDECIN_NOT_FOUND', 404);
    }

    // Mettre à jour l'avatar
    const updatedMedecin = await prisma.medecin.update({
      where: { id: medecinId },
      data: {
        // @ts-expect-error - avatarUrl et avatarFileName existent dans le schéma Prisma mais les types ne sont pas synchronisés localement
        avatarUrl: input.avatarUrl ?? null,
        avatarFileName: input.avatarFileName ?? null,
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        // @ts-expect-error - avatarUrl et avatarFileName existent dans le schéma Prisma mais les types ne sont pas synchronisés localement
        avatarUrl: true,
        avatarFileName: true,
      },
    });

    return updatedMedecin;
  }
}

export const authService = new AuthService();

