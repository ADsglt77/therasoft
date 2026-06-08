/**
 * Pont entre Better Auth et le mailer unique du projet : les emails de
 * vérification et de réinitialisation passent par le même transporteur SMTP
 * (`lib/mailer`) et les mêmes gabarits brandés (logo CID) que les emails de RDV.
 *
 * Le lien fourni par Better Auth est bâti sur `APP_URL` ; on réécrit son origine
 * sur le domaine réel de la requête (via `withRequestOrigin`) quand c'est possible.
 */
import { sendMail, logoAttachment } from './mailer';
import { verificationEmail, passwordResetEmail } from './email-templates';
import { withRequestOrigin } from './request-url';

/** Prénom déduit du `name` Better Auth ("Nom Prénom" → "Prénom"), avec repli. */
function prenomFromName(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.slice(1).join(' ') || parts[0] || '';
}

export async function sendVerificationEmail(
  email: string,
  url: string,
  name?: string,
  request?: unknown
): Promise<void> {
  const link = withRequestOrigin(url, request);
  const mail = verificationEmail({ prenom: prenomFromName(name), link });
  await sendMail({ to: email, ...mail, attachments: logoAttachment() });
}

export async function sendResetPasswordEmail(
  email: string,
  url: string,
  name?: string,
  request?: unknown
): Promise<void> {
  const link = withRequestOrigin(url, request);
  const mail = passwordResetEmail({ prenom: prenomFromName(name), link });
  await sendMail({ to: email, ...mail, attachments: logoAttachment() });
}
