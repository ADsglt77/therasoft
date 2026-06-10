import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../lib/prisma';
import { verifyRdvOwnership } from './services/dossier.shared';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    rdv: { findFirst: vi.fn() },
  },
}));

describe('verifyRdvOwnership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('autorise si le RDV est directement affecté au médecin', async () => {
    vi.mocked(prisma.rdv.findFirst).mockResolvedValueOnce({ id: 10 } as never);

    await expect(verifyRdvOwnership(10, 2)).resolves.toBeUndefined();

    expect(prisma.rdv.findFirst).toHaveBeenCalledWith({
      where: {
        id: 10,
        OR: [{ medecinId: 2 }, { vacationLinks: { some: { vacation: { medecinId: 2 } } } }],
      },
      select: { id: true },
    });
  });

  it('autorise si le RDV est lié à une vacation du médecin', async () => {
    vi.mocked(prisma.rdv.findFirst).mockResolvedValueOnce({ id: 10 } as never);

    await expect(verifyRdvOwnership(10, 2)).resolves.toBeUndefined();
  });

  it('refuse si le RDV ne correspond à aucun chemin d’appartenance', async () => {
    vi.mocked(prisma.rdv.findFirst).mockResolvedValueOnce(null);

    await expect(verifyRdvOwnership(10, 2)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});
