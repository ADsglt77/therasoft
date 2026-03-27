import { defineConfig } from 'prisma/config';
import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export default defineConfig({
  migrations: {
    // Prisma 7 lit la commande de seed depuis prisma.config.ts
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Toujours fournir un URL (sinon `prisma migrate dev` échoue si DATABASE_URL n'est pas injectée).
    // En prod Docker, DATABASE_URL est fourni via compose/dokploy.
    // En dev sans Docker, on utilise la valeur du .env de la racine.
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/portail_medecin?schema=public',
  },
});

