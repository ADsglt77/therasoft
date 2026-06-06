import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    medecin: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    patient: {
      findUnique: vi.fn(),
    },
    authSession: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    $disconnect: vi.fn(),
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  },
  pool: { end: vi.fn() },
}));

import { prisma } from '../../lib/prisma';
import { createApp } from '../../app';

const validPassword = 'Azertyuiop1!';

describe('POST /api/auth/register', () => {
  it('retourne 403 quand ALLOW_PUBLIC_REGISTER est false', async () => {
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({
        email: 'new@example.com',
        password: validPassword,
        nom: 'Dupont',
        prenom: 'Jean',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_REGISTER_DISABLED');
    expect(prisma.medecin.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne un message générique si l\'email est inconnu', async () => {
    vi.mocked(prisma.medecin.findUnique).mockResolvedValueOnce(null);

    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: validPassword });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Identifiants invalides');
  });

  it('retourne un message générique si le mot de passe est incorrect', async () => {
    vi.mocked(prisma.medecin.findUnique).mockResolvedValueOnce({
      id: 1,
      email: 'user@user.user',
      nom: 'User',
      prenom: 'Test',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$invalid',
      role: 'MEDECIN',
      isActive: true,
      lastLoginAt: null,
      avatarUrl: null,
      avatarFileName: null,
    } as never);

    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'user@user.user', password: 'WrongPass123!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Identifiants invalides');
  });
});

describe('POST /api/auth/logout', () => {
  it('retourne 204 même sans cookie refresh', async () => {
    const res = await request(createApp()).post('/api/auth/logout');
    expect(res.status).toBe(204);
  });
});
