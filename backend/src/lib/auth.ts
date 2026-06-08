import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { env } from '../config/env';
import { prisma } from './prisma';
import { sendVerificationEmail, sendResetPasswordEmail } from './email';

export const auth = betterAuth({
  secret: env.jwtAccessSecret,
  baseURL: `${env.appUrl}/api/auth`,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    async sendResetPassword({ user, url }: any, request?: unknown) {
      await sendResetPasswordEmail(user.email, url, user.name, request);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    async sendVerificationEmail({ user, url }: any, request?: unknown) {
      await sendVerificationEmail(user.email, url, user.name, request);
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'PATIENT',
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const parts = user.name.split(' ');
          const nom = parts[0] || 'Inconnu';
          const prenom = parts.slice(1).join(' ') || '';

          if (user.role === 'MEDECIN' || user.role === 'SECRETAIRE') {
            await prisma.medecin.create({
              data: {
                nom,
                prenom,
                userId: user.id,
                isActive: true,
              },
            });
          } else {
            await prisma.patient.create({
              data: {
                nom,
                prenom,
                userId: user.id,
              },
            });
          }
        },
      },
    },
  },
});
