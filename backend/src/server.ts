import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma, pool } from './lib/prisma';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info({ port: env.port }, 'Server started');
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, 'Shutdown signal received');

  const forceExit = setTimeout(() => {
    logger.error({ signal }, 'Graceful shutdown timed out');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
      server.closeIdleConnections();
    });
    await prisma.$disconnect();
    await pool.end();
    logger.info('HTTP server and database connections closed');
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExit);
    throw error;
  }
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
