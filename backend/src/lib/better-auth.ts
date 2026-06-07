import type { Request, Response } from 'express';
import { env } from '../config/env';
import { prisma } from './prisma';
import { logoAttachment, sendMail } from './mailer';
import { passwordResetEmail, verificationEmail } from './email-templates';

type BetterAuthInstance = Awaited<ReturnType<typeof createBetterAuth>>;

let authPromise: Promise<BetterAuthInstance> | null = null;

async function createBetterAuth() {
  const [{ betterAuth }, { prismaAdapter }] = await Promise.all([import('better-auth'), import('better-auth/adapters/prisma')]);

  return betterAuth({
    baseURL: env.appUrl,
    basePath: '/api/auth/system',
    secret: env.betterAuthSecret,
    trustedOrigins: [env.frontendOrigin, env.appUrl],
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        const { subject, html, text } = passwordResetEmail({ prenom: user.name || 'Utilisateur', link: url });
        await sendMail({ to: user.email, subject, html, text, attachments: logoAttachment() });
      },
    },
    emailVerification: {
      sendOnSignUp: false,
      sendVerificationEmail: async ({ user, url }) => {
        const { subject, html, text } = verificationEmail({ prenom: user.name || 'Utilisateur', link: url });
        await sendMail({ to: user.email, subject, html, text, attachments: logoAttachment() });
      },
    },
    user: {
      additionalFields: {
        role: { type: 'string', required: true },
        profileType: { type: 'string', required: true },
        profileId: { type: 'number', required: true },
      },
    },
  });
}

export async function getBetterAuth(): Promise<BetterAuthInstance> {
  authPromise ??= createBetterAuth();
  return authPromise;
}

export function requestHeaders(req: Request): Headers {
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (typeof value === 'string') {
      headers.set(key, value);
      return;
    }
    if (Array.isArray(value)) {
      headers.set(key, value.join(','));
    }
  });
  return headers;
}

export function applySetCookieHeaders(res: Response, source: Headers): void {
  const setCookie = source.get('set-cookie');
  if (setCookie) {
    res.setHeader('set-cookie', setCookie);
  }
}

