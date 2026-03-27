import path from 'path';
import dotenv from 'dotenv';

// Charge d'abord le .env local au dossier de travail (backend/.env éventuel),
// puis charge le .env à la racine du repo (cas dev local sans Docker).
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  
  // JWT
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  accessTokenTtlMinutes: parseInt(process.env.ACCESS_TOKEN_TTL_MINUTES || '15', 10),
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10),
  
  // Frontend
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:4200',
} as const;
