import type { Prisma } from '@prisma/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../lib/prisma';
import { sitesService } from './sites.service';

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    site: { findMany: vi.fn() },
    rdvVacation: { findMany: vi.fn() },
    rdv: { findMany: vi.fn() },
  },
}));

describe('SitesService.getSitesByMedecin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.rdv.findMany).mockResolvedValue([]);
  });

  it('agrège RDV distincts/à venir, modalités et trie par rdvCount desc', async () => {
    vi.mocked(prisma.site.findMany).mockResolvedValueOnce([
      {
        id: 1,
        nom: 'Hôpital A',
        ville: 'Paris',
        adresse: null,
        latitude: null,
        longitude: null,
        websiteUrl: null,
        openingHours: null,
        vacations: [
          { modalite: 'CT', date: new Date('2999-01-01') },
          { modalite: 'CT', date: new Date('2999-01-02') },
          { modalite: 'MRI', date: new Date('2999-01-03') },
        ],
      },
      {
        id: 2,
        nom: 'Clinique B',
        ville: 'Lyon',
        adresse: null,
        latitude: null,
        longitude: null,
        websiteUrl: null,
        openingHours: null,
        vacations: [{ modalite: 'US', date: new Date('2999-02-01') }],
      },
    ] as never);

    vi.mocked(prisma.rdvVacation.findMany).mockResolvedValueOnce([
      // Site 1 : rdv 10 (doublon de lien) + rdv 11 passé → 2 distincts, 1 à venir
      { rdvId: 10, vacation: { siteId: 1 }, rdv: { date: new Date('2999-01-01') } },
      { rdvId: 10, vacation: { siteId: 1 }, rdv: { date: new Date('2999-01-01') } },
      { rdvId: 11, vacation: { siteId: 1 }, rdv: { date: new Date('2000-01-01') } },
      // Site 2 : rdv 20 à venir
      { rdvId: 20, vacation: { siteId: 2 }, rdv: { date: new Date('2999-02-01') } },
    ] as never);
    vi.mocked(prisma.rdv.findMany).mockResolvedValueOnce([
      { id: 10, siteId: 1, date: new Date('2999-01-01') },
      { id: 12, siteId: 1, date: new Date('2999-01-04') },
    ] as never);

    const result = await sitesService.getSitesByMedecin(2);

    expect(result).toHaveLength(2);
    // Le RDV 10 existe par les deux chemins et reste compte une seule fois.
    expect(result[0].id).toBe(1);
    expect(result[0].rdvCount).toBe(3);
    expect(result[0].rdvUpcomingCount).toBe(2);
    expect(result[0].vacationCount).toBe(3);
    expect([...result[0].modalites].sort()).toEqual(['CT', 'MRI']);
    expect(result[1].id).toBe(2);
    expect(result[1].rdvCount).toBe(1);
  });

  it('avec q, filtre par nom de site, ville et nom de patient (where.OR)', async () => {
    vi.mocked(prisma.site.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.rdvVacation.findMany).mockResolvedValueOnce([] as never);

    await sitesService.getSitesByMedecin(2, 'Lefebvre');

    const arg = vi.mocked(prisma.site.findMany).mock.calls[0][0] as Prisma.SiteFindManyArgs;
    expect(arg.where.OR).toHaveLength(4);
    expect(arg.where.OR[0]).toEqual({ nom: { contains: 'Lefebvre', mode: 'insensitive' } });
    expect(arg.where.OR[1]).toEqual({ ville: { contains: 'Lefebvre', mode: 'insensitive' } });
    expect(arg.where.OR[2].vacations.some.rdvLinks.some.rdv.patient.OR).toEqual([
      { nom: { contains: 'Lefebvre', mode: 'insensitive' } },
      { prenom: { contains: 'Lefebvre', mode: 'insensitive' } },
    ]);
    expect(arg.where.OR[3].rdvs.some.medecinId).toBe(2);
  });

  it('sans q, ne pose pas de filtre OR', async () => {
    vi.mocked(prisma.site.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.rdvVacation.findMany).mockResolvedValueOnce([] as never);

    await sitesService.getSitesByMedecin(2);

    const arg = vi.mocked(prisma.site.findMany).mock.calls[0][0] as Prisma.SiteFindManyArgs;
    expect(arg.where.OR).toBeUndefined();
  });
});
