import { defineConfig, env } from 'prisma/config';
import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Prisma 7 configuration for migrations
 * The datasource URL is now configured here instead of in schema.prisma
 */
export default defineConfig({
  datasource: {
    // Sans Docker: utilise DATABASE_URL du .env.
    url: env('DATABASE_URL'),
  },
});

