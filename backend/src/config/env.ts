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
  allowPublicRegister: data.ALLOW_PUBLIC_REGISTER,
  resetDbOnSeed: data.RESET_DB_ON_SEED,
} as const;
