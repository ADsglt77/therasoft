import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { requestIdMiddleware } from './middlewares/requestId';
import { errorHandler } from './middlewares/errorHandler';
import apiRoutes from './routes';
import { env } from './config/env';

/**
 * Configuration de l'application Express
 */
export const createApp = (): Express => {
  const app = express();

  // Sécurité: Helmet (headers sécurisés)
  app.use(helmet());

  // CORS : en production on restreint à FRONTEND_ORIGIN, en dev on accepte tout
  const corsOrigin = env.nodeEnv === 'production' && env.frontendOrigin
    ? env.frontendOrigin
    : true;
  app.use(cors({
    origin: corsOrigin,
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

  // Servir les fichiers statiques (uploads)
  app.use('/uploads', express.static('uploads'));

  // Routes API
  app.use('/api', apiRoutes);

  // Middleware de gestion d'erreurs (doit être en dernier)
  app.use(errorHandler);

  return app;
};
