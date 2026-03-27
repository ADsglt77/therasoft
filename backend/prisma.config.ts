import { defineConfig, env } from 'prisma/config';
import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export default defineConfig({
  datasource: {
    // Sans Docker: utilise DATABASE_URL du .env.
    url: env('DATABASE_URL'),
  },
});

