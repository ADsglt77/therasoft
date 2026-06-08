import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from './prisma';
import { sendVerificationEmail, sendResetPasswordEmail } from './email';
import { isStaffRole, parseRole, splitProfileName } from './roles';

const useSecureCookies = new URL(env.appUrl).protocol === 'https:';

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

          if (isStaffRole(role)) {
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
