import pino from 'pino';
import { env } from '../config/env';

/**
 * Logger structuré (Pino). En développement/test : sortie lisible ;
 * en production : JSON pour agrégation de logs.
 */
export const logger = pino({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  ...(env.nodeEnv !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard' },
    },
  }),
});
