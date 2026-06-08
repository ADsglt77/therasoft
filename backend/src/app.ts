import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { requestIdMiddleware } from './middlewares/requestId';
import { errorHandler } from './middlewares/errorHandler';
import apiRoutes from './routes';
import { env } from './config/env';
import { logger } from './lib/logger';

export const createApp = (): Express => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req.headers['x-request-id'] as string) || 'unknown',
      customProps: (req) => ({ requestId: req.headers['x-request-id'] }),
    })
  );

  app.use('/api', apiRoutes);

  // Mount Better Auth directly to avoid Express router path stripping
  // Requires importing toNodeHandler and auth
  app.all('/api/auth/*', (req, res) => {
    const { auth } = require('./lib/auth');
    const { toNodeHandler } = require('better-auth/node');
    return toNodeHandler(auth)(req, res);
  });
  app.use(errorHandler);

  return app;
};
