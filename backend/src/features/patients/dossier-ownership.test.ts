import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../lib/prisma';
import { verifyRdvOwnership } from './services/dossier.shared';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    rdvVacation: { findFirst: vi.fn() },
  },
}));

describe('verifyRdvOwnership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('autorise si une liaison RDV-vacation existe pour le médecin', async () => {
    vi.mocked(prisma.rdvVacation.findFirst).mockResolvedValueOnce({ id: 1 } as never);

    await expect(verifyRdvOwnership(10, 2)).resolves.toBeUndefined();

    expect(prisma.rdvVacation.findFirst).toHaveBeenCalledWith({
      where: { rdvId: 10, vacation: { medecinId: 2 } },
    });
  });

  it('refuse si aucune liaison', async () => {
    vi.mocked(prisma.rdvVacation.findFirst).mockResolvedValueOnce(null);

    await expect(verifyRdvOwnership(10, 2)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});
