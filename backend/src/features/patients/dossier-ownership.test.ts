import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    modalite: { findFirst: vi.fn() },
    dossier: { findUnique: vi.fn() },
    $disconnect: vi.fn(),
  },
  pool: { end: vi.fn() },
}));

import { prisma } from '../../lib/prisma';
import { verifyRdvOwnership } from './services/dossier.shared';
import { ApiError } from '../../middlewares/errorHandler';

describe('verifyRdvOwnership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ne lève pas d\'erreur quand le RDV appartient au médecin', async () => {
    vi.mocked(prisma.modalite.findFirst).mockResolvedValueOnce({ id: 1 } as never);

    await expect(verifyRdvOwnership(10, 2)).resolves.toBeUndefined();
    expect(prisma.modalite.findFirst).toHaveBeenCalledWith({
      where: { rdvId: 10, vacation: { medecinId: 2 } },
    });
  });

  it('lève 403 quand le RDV n\'appartient pas au médecin', async () => {
    vi.mocked(prisma.modalite.findFirst).mockResolvedValueOnce(null);

    const err = await verifyRdvOwnership(10, 99).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });
});
