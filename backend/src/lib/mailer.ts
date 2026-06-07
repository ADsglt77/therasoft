import fs from 'fs';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

/**
 * Envoi d'emails via SMTP (variables d'env SMTP_*).
 * Si aucun SMTP n'est configuré (SMTP_HOST absent), le contenu est loggué
 * au lieu d'être envoyé — pratique en dev sans serveur mail.
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

/** Repli : loggue le message (le lien reste utilisable) quand l'envoi n'est pas possible. */
function logFallback(message: MailMessage, reason: string): void {
  console.log(`📧 [MAIL ${reason}] → ${message.to} : ${message.subject}`);
  console.log(`   ${message.text}`);
}

export async function sendMail(message: MailMessage): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    logFallback(message, 'SMTP non configuré');
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
    console.log(`📧 Email envoyé à ${message.to} (id ${info.messageId})`);
  } catch (err) {
    // SMTP configuré mais envoi en échec (identifiants manquants/incorrects…) : on loggue le lien.
    console.error('Envoi SMTP échoué :', (err as Error)?.message);
    logFallback(message, 'repli après échec SMTP');
  }
}
