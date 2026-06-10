import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  },
  pool: { end: vi.fn() },
}));

import { prisma } from '../lib/prisma';
import { createApp } from '../app';

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne status ok quand la base répond', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ '?column?': 1 }]);

    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok' });
  });

  it('retourne 503 quand la base est indisponible', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'degraded', db: 'error' });
  });

  it('retourne une erreur JSON uniforme pour une route API inconnue', async () => {
    const res = await request(createApp()).get('/api/inconnue');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: 'Ressource API introuvable',
      },
    });
    expect(res.body.requestId).toEqual(expect.any(String));
  });
});
