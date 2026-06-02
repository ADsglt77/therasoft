import { spawnSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

// .env racine du monorepo, puis backend/.env en secours
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/portail_medecin?schema=public';

const port = process.env.PRISMA_STUDIO_PORT || '5555';
const backendRoot = path.resolve(__dirname, '..');

console.log(`📊 Prisma Studio: http://localhost:${port}\n`);

const result = spawnSync(`npx prisma studio --port ${port} --browser none`, {
  stdio: 'inherit',
  cwd: backendRoot,
  shell: true,
  env: {
    ...process.env,
    DATABASE_URL: dbUrl,
  },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
