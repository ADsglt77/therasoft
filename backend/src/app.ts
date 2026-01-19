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

  // CORS - Permet toutes les origines en dev (NGINX gère CORS en prod)
  app.use(cors({
    origin: true, // Permet toutes les origines (NGINX gère CORS)
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

  // Routes API
  app.use('/api', apiRoutes);

  // Middleware de gestion d'erreurs (doit être en dernier)
  app.use(errorHandler);

  return app;
};
