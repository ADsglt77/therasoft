import { z } from 'zod';

/**
 * Booléen lu depuis une variable d'environnement (chaîne 'true' / 'false').
 */
const envBool = (defaultValue: boolean) =>
  z
    .enum(['true', 'false'])
    .default(defaultValue ? 'true' : 'false')
    .transform((v) => v === 'true');

/**
 * Variables injectées par Docker Compose au runtime.
 * Pas de chargement .env : tout passe par process.env du conteneur.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  FRONTEND_ORIGIN: z.string().default('http://localhost'),
  // Base des liens envoyés par email (par défaut = FRONTEND_ORIGIN).
  APP_URL: z.string().optional(),

  // SMTP (vérification d'email). Optionnel : sans SMTP_HOST, le lien est loggé au lieu d'être envoyé.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: envBool(false),
  MAIL_FROM: z.string().default('TsXcare <no-reply@tsxcare.local>'),

  // Inscription publique : false en prod, true pour la démo / le dev.
  ALLOW_PUBLIC_REGISTER: envBool(false),
  // Reset complet de la base au seed (démo). false = seed idempotent.
  RESET_DB_ON_SEED: envBool(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

export const env = {
  port: data.PORT,
  nodeEnv: data.NODE_ENV,
  databaseUrl: data.DATABASE_URL,

  jwtAccessSecret: data.JWT_ACCESS_SECRET,
  jwtRefreshSecret: data.JWT_REFRESH_SECRET,
  accessTokenTtlMinutes: data.ACCESS_TOKEN_TTL_MINUTES,
  refreshTokenTtlDays: data.REFRESH_TOKEN_TTL_DAYS,

  frontendOrigin: data.FRONTEND_ORIGIN,
  appUrl: data.APP_URL || data.FRONTEND_ORIGIN,
  allowPublicRegister: data.ALLOW_PUBLIC_REGISTER,
  resetDbOnSeed: data.RESET_DB_ON_SEED,

  smtp: {
    host: data.SMTP_HOST,
    port: data.SMTP_PORT,
    user: data.SMTP_USER,
    pass: data.SMTP_PASS,
    secure: data.SMTP_SECURE,
    from: data.MAIL_FROM,
  },
} as const;
