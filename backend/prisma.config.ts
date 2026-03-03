import { defineConfig } from 'prisma/config';
import 'dotenv/config';

/**
 * Prisma 7 configuration for migrations
 * The datasource URL is now configured here instead of in schema.prisma
 */
export default defineConfig({
  datasource: {
    // À l'exécution : DATABASE_URL est fournie par docker-compose. Au build : fallback pour prisma generate.
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/portail_medecin?schema=public",
  },
});

