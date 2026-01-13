import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`🚀 Server running on port ${env.port}`);
  console.log(`📡 Health check: http://localhost:${env.port}/api/health`);
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
