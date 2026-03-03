import { defineConfig, env } from 'prisma/config';
import 'dotenv/config';

/**
 * Prisma 7 configuration for migrations
 * The datasource URL is now configured here instead of in schema.prisma
 */
export default defineConfig({
  datasource: {
    url: env("DATABASE_URL"),
  },
});

