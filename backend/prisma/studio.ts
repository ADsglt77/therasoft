import { execSync } from 'child_process';

const dbUrl = 'postgresql://postgres:postgres@db:5432/portail_medecin?schema=public';

console.log('📊 Prisma Studio: http://localhost:5555\n');

execSync(`HOST=0.0.0.0 npx prisma studio --url "${dbUrl}" --port 5555 --browser none`, {
  stdio: 'inherit',
  shell: '/bin/sh',
});

