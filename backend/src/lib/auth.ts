import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from './prisma';
import { sendVerificationEmail, sendResetPasswordEmail } from './email';
import { passwordPolicyError } from './password-policy';

const useSecureCookies = new URL(env.appUrl).protocol === 'https:';

function parseRole(value: unknown): Role | null {
  return typeof value === 'string' && (Object.values(Role) as string[]).includes(value)
    ? (value as Role)
    : null;
}

function splitProfileName(name: string): { nom: string; prenom: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { nom: parts[0] ?? 'Inconnu', prenom: parts.slice(1).join(' ') };
}

export const auth = betterAuth({
  secret: env.authSecret,
  baseURL: `${env.appUrl}/api/auth`,
  // Origines de confiance (CSRF + validation des callbackURL).
  trustedOrigins: [env.frontendOrigin, env.appUrl],
  // Limitation de débit des endpoints Better Auth (strict sur l'authentification).
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/*': { window: 60, max: 5 },
      '/sign-up/*': { window: 60, max: 5 },
      '/request-password-reset': { window: 60, max: 3 },
    },
  },
  advanced: {
    useSecureCookies,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: useSecureCookies,
      path: '/',
    },
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'],
    },
  },
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    requireEmailVerification: false,
    async sendResetPassword({ user, url }, request) {
      await sendResetPasswordEmail(user.email, url, user.name, request);
    },
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      const body = context.body as { password?: unknown; newPassword?: unknown } | null | undefined;
      const candidate =
        context.path === '/sign-up/email'
          ? body?.password
          : context.path === '/change-password' || context.path === '/reset-password'
            ? body?.newPassword
            : undefined;

      if (typeof candidate !== 'string') {
        return;
      }
      const message = passwordPolicyError(candidate);
      if (message) {
        throw new APIError('BAD_REQUEST', { message });
      }
    }),
  },
  emailVerification: {
    sendOnSignUp: true,
    async sendVerificationEmail({ user, url }, request) {
      await sendVerificationEmail(user.email, url, user.name, request);
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        // Empêche un client de choisir son rôle à l'inscription (anti-élévation de privilège).
        input: false,
        defaultValue: Role.PATIENT,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const { nom, prenom } = splitProfileName(user.name);
          const role = parseRole(user.role) ?? Role.PATIENT;

          if (role === Role.MEDECIN) {
            await prisma.medecin.create({
              data: { nom, prenom, userId: user.id, isActive: true },
            });
          } else {
            await prisma.patient.create({
              data: { nom, prenom, userId: user.id },
            });
          }
        },
      },
    },
  },
});
