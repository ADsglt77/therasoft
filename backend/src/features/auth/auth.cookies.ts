import { Response } from 'express';
import { env } from '../../config/env';

function cookieBase() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax' as const,
  };
}

export function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.clearCookie('refresh_token', { path: '/api/auth' });
  res.cookie('refresh_token', refreshToken, {
    ...cookieBase(),
    path: '/api',
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  const base = cookieBase();
  res.clearCookie('refresh_token', { ...base, path: '/api' });
  res.clearCookie('refresh_token', { ...base, path: '/api/auth' });
}
