import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { toNodeHandler } from 'better-auth/node';
import { requestIdMiddleware } from './middlewares/requestId';
import { errorHandler } from './middlewares/errorHandler';
import apiRoutes from './routes';
import { env } from './config/env';
import { auth } from './lib/auth';
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
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req.headers['x-request-id'] as string) || 'unknown',
      customProps: (req) => ({ requestId: req.headers['x-request-id'] }),
    })
  );

  app.use('/api', apiRoutes);

  // Les routes profil (/api/auth/me, /medecins…) sont montées avant ce catch-all ;
  // tout le reste de /api/auth/* est délégué à Better Auth.
  app.all('/api/auth/*', toNodeHandler(auth));
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Ressource API introuvable',
        details: null,
      },
      requestId: req.headers['x-request-id'] || 'unknown',
    });
  });
  app.use(errorHandler);

  return app;
};
