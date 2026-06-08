import fs from 'fs';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * Envoi d'emails via SMTP (variables d'env SMTP_*).
 * Si aucun SMTP n'est configuré (SMTP_HOST absent), aucun email n'est envoyé
 * et une erreur est notifiée dans les logs.
 */
let transporter: Transporter | null = null;
let initialized = false;

function getTransporter(): Transporter | null {
  if (initialized) {
    return transporter;
  }
  initialized = true;
  if (!env.smtp.host) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return transporter;
}

export interface MailAttachment {
  filename: string;
  content?: Buffer;
  path?: string;
  cid?: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
}

// Logo embarqué (CID) — chargé une fois, repli silencieux si introuvable.
let logoCache: Buffer | null | undefined;
function getLogo(): Buffer | null {
  if (logoCache !== undefined) {
    return logoCache;
  }
  try {
    logoCache = fs.readFileSync(path.join(process.cwd(), 'assets', 'logo.png'));
  } catch {
    logoCache = null;
  }
  return logoCache;
}

/** Pièce jointe du logo (référencée par `cid:tsxcare-logo` dans le HTML). */
export function logoAttachment(): MailAttachment[] {
  const logo = getLogo();
  return logo ? [{ filename: 'logo.png', content: logo, cid: 'tsxcare-logo' }] : [];
}

export async function sendMail(message: MailMessage): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    logger.error(
      { to: message.to, subject: message.subject },
      'Email non envoyé : SMTP non configuré (SMTP_HOST manquant)'
    );
    return;
  }
  try {
    const info = await tx.sendMail({
      from: env.smtp.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments,
    });
    logger.info({ to: message.to, messageId: info.messageId }, 'Email envoyé');
  } catch (err) {
    logger.error({ to: message.to, subject: message.subject, err }, 'Envoi SMTP échoué');
  }
}
