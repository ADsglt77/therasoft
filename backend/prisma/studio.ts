import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

let databaseUrl = process.env.DATABASE_URL;

if (databaseUrl?.includes('@db:') && !process.env.DOCKER_CONTAINER) {
  databaseUrl = databaseUrl.replace('@db:', '@localhost:');
}

if (!databaseUrl) {
  console.error('❌ DATABASE_URL non défini');
  process.exit(1);
}

execSync(`npx prisma studio --url "${databaseUrl}"`, {
  stdio: 'inherit',
  shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
});

