import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { requestIdMiddleware } from './middlewares/requestId';
import { errorHandler } from './middlewares/errorHandler';
import apiRoutes from './routes';
import { env } from './config/env';
import { logger } from './lib/logger';

/**
 * Configuration de l'application Express
 */
export const createApp = (): Express => {
  const app = express();

  // Derrière le reverse proxy nginx : req.ip reflète X-Forwarded-For
  app.set('trust proxy', 1);

  // Sécurité: Helmet (headers sécurisés)
  app.use(helmet());

  // CORS : origine du frontend (même domaine via nginx en prod)
  app.use(cors({
    origin: env.frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  }));

  // Middlewares globaux
  // Limite de 10MB pour permettre l'upload d'avatars en base64
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
      customProps: (req) => ({ requestId: req.headers['x-request-id'] }),
    })
  );

  // Les fichiers de dossier ne sont jamais servis en statique :
  // l'accès passe uniquement par /api/.../dossier/files/:fileId/download
  // qui vérifie que le RDV appartient au médecin connecté.

  // Routes API
  app.use('/api', apiRoutes);

  // Middleware de gestion d'erreurs (doit être en dernier)
  app.use(errorHandler);

  return app;
};
