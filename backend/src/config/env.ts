import { z } from 'zod';

/**
 * Booléen lu depuis une variable d'environnement (chaîne 'true' / 'false').
 */
const envBool = (defaultValue: boolean) =>
  z
    .enum(['true', 'false'])
    .default(defaultValue ? 'true' : 'false')
    .transform((v) => v === 'true');

const httpUrl = z
  .string()
  .url()
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
    message: 'URL must use http or https',
  })
  .transform((value) => value.replace(/\/+$/, ''));

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional()
);

/**
 * Variables injectées par Docker Compose au runtime.
 * Pas de chargement .env : tout passe par process.env du conteneur.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Secret Better Auth (signature des sessions). ≥ 32 caractères.
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),

  FRONTEND_ORIGIN: httpUrl.default('http://localhost'),
  // Base des liens envoyés par email (par défaut = FRONTEND_ORIGIN).
  APP_URL: z.preprocess((value) => (value === '' ? undefined : value), httpUrl.optional()),

  // SMTP (vérification d'email). Optionnel : sans SMTP_HOST, l'envoi échoue et est notifié.
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SMTP_SECURE: envBool(false),
  MAIL_FROM: z.string().default('TsXcare <no-reply@tsxcare.local>'),

  // Reset complet de la base au seed (démo). false = seed idempotent.
  RESET_DB_ON_SEED: envBool(false),
  // Autorise explicitement la baseline d'une base historique sans table Prisma.
  BASELINE_EXISTING_DB: envBool(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

if (
  data.NODE_ENV === 'production' &&
  data.AUTH_SECRET === 'replace-with-a-long-random-secret-min-32-chars'
) {
  console.error('❌ AUTH_SECRET must be replaced before running in production');
  process.exit(1);
}

export const env = {
  port: data.PORT,
  nodeEnv: data.NODE_ENV,
  databaseUrl: data.DATABASE_URL,

  authSecret: data.AUTH_SECRET,

  frontendOrigin: data.FRONTEND_ORIGIN,
  appUrl: data.APP_URL || data.FRONTEND_ORIGIN,
  resetDbOnSeed: data.RESET_DB_ON_SEED,
  baselineExistingDb: data.BASELINE_EXISTING_DB,

  smtp: {
    host: data.SMTP_HOST,
    port: data.SMTP_PORT,
    user: data.SMTP_USER,
    pass: data.SMTP_PASS,
    secure: data.SMTP_SECURE,
    from: data.MAIL_FROM,
  },
} as const;
