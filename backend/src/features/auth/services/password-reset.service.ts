import jwt from 'jsonwebtoken';
import { prisma } from '../../../lib/prisma';
import { env } from '../../../config/env';
import { ApiError } from '../../../middlewares/errorHandler';
import { authService } from './auth.service';
import { sendMail, logoAttachment } from '../../../lib/mailer';
import { passwordResetEmail } from '../../../lib/email-templates';

type Principal = 'medecin' | 'patient';

/**
 * Réinitialisation de mot de passe (mot de passe oublié), pour les médecins
 * comme pour les patients. Jeton JWT court (1 h) ; révoque les sessions actives.
 */
interface ResetPayload {
  principal: Principal;
  id: number;
  purpose: string;
}

const INVALID = () => new ApiError('Lien de réinitialisation invalide ou expiré', 'AUTH_RESET_TOKEN_INVALID', 400);

export class PasswordResetService {
  // Le jeton est signé avec le hash actuel du mot de passe : dès que celui-ci change,
  // le jeton devient invalide → usage unique, et expiration 1 h.
  private secretFor(passwordHash: string): string {
    return `${env.jwtAccessSecret}.${passwordHash}`;
  }

  private generateToken(principal: Principal, id: number, passwordHash: string): string {
    return jwt.sign({ principal, id, purpose: 'reset-password' }, this.secretFor(passwordHash), { expiresIn: '1h' });
  }

  /** Envoie un email de réinitialisation si l'email existe (sinon : rien — anti-énumération). */
  async requestReset(email: string): Promise<void> {
    const medecin = await prisma.medecin.findUnique({
      where: { email },
      select: { id: true, prenom: true, email: true, passwordHash: true },
    });
    if (medecin?.passwordHash) {
      await this.send('medecin', medecin.id, medecin.prenom, medecin.email, medecin.passwordHash);
      return;
    }
    const patient = await prisma.patient.findUnique({
      where: { email },
      select: { id: true, prenom: true, email: true, passwordHash: true },
    });
    if (patient?.email && patient.passwordHash) {
      await this.send('patient', patient.id, patient.prenom, patient.email, patient.passwordHash);
    }
  }

  private async send(principal: Principal, id: number, prenom: string, email: string, passwordHash: string): Promise<void> {
    const token = this.generateToken(principal, id, passwordHash);
    const link = `${env.appUrl}/reinitialiser-mot-de-passe?token=${token}`;
    const mail = passwordResetEmail({ prenom, link });
    await sendMail({ to: email, ...mail, attachments: logoAttachment() });
  }

  /** Vérifie le jeton et applique le nouveau mot de passe (médecin ou patient). */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // 1) Lecture (sans vérif) du principal/id pour récupérer le hash courant.
    const decoded = jwt.decode(token) as ResetPayload | null;
    if (
      !decoded ||
      decoded.purpose !== 'reset-password' ||
      !decoded.id ||
      (decoded.principal !== 'medecin' && decoded.principal !== 'patient')
    ) {
      throw INVALID();
    }

    const currentHash = await this.currentHash(decoded.principal, decoded.id);
    if (!currentHash) {
      throw INVALID();
    }

    // 2) Vérification avec le secret dérivé du hash courant (échoue si le mdp a déjà changé / jeton falsifié).
    try {
      jwt.verify(token, this.secretFor(currentHash));
    } catch {
      throw INVALID();
    }

    const passwordHash = await authService.hashPassword(newPassword);
    if (decoded.principal === 'medecin') {
      await prisma.$transaction([
        prisma.medecin.update({ where: { id: decoded.id }, data: { passwordHash } }),
        prisma.authSession.updateMany({ where: { medecinId: decoded.id, revokedAt: null }, data: { revokedAt: new Date() } }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.patient.update({ where: { id: decoded.id }, data: { passwordHash } }),
        prisma.authSession.updateMany({ where: { patientId: decoded.id, revokedAt: null }, data: { revokedAt: new Date() } }),
      ]);
    }
  }

  private async currentHash(principal: Principal, id: number): Promise<string | null> {
    if (principal === 'medecin') {
      const m = await prisma.medecin.findUnique({ where: { id }, select: { passwordHash: true } });
      return m?.passwordHash ?? null;
    }
    const p = await prisma.patient.findUnique({ where: { id }, select: { passwordHash: true } });
    return p?.passwordHash ?? null;
  }
}

export const passwordResetService = new PasswordResetService();
