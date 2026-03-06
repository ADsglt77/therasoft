import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  // Frontend
  FRONTEND_ORIGIN: z.string().default('http://localhost:4200'),
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

  // JWT
  jwtAccessSecret: data.JWT_ACCESS_SECRET,
  jwtRefreshSecret: data.JWT_REFRESH_SECRET,
  accessTokenTtlMinutes: data.ACCESS_TOKEN_TTL_MINUTES,
  refreshTokenTtlDays: data.REFRESH_TOKEN_TTL_DAYS,

  // Frontend
  frontendOrigin: data.FRONTEND_ORIGIN,
} as const;
