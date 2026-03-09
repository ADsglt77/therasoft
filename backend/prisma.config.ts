import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'prisma/config';

const rootEnv = path.resolve(process.cwd(), '..', '.env');
const localEnv = path.resolve(process.cwd(), '.env');
if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv });
else dotenv.config({ path: localEnv });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/portail_medecin?schema=public",
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
});

