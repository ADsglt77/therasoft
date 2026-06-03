import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma, pool } from './lib/prisma';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info({ port: env.port }, 'Server started');
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received');

  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

  await prisma.$disconnect();
  await pool.end();
  logger.info('HTTP server and database connections closed');
  process.exit(0);
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((err) => {
    logger.error({ err }, 'Shutdown failed');
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((err) => {
    logger.error({ err }, 'Shutdown failed');
    process.exit(1);
  });
});
