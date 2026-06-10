import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from '../config/env';

/**
 * Instance PrismaClient avec adaptateur PostgreSQL pour Prisma 7
 */
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
