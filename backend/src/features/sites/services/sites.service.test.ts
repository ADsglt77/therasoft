import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../lib/prisma';
import { sitesService } from './sites.service';

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    site: { findMany: vi.fn() },
    rdvVacation: { findMany: vi.fn() },
  },
}));

describe('SitesService.getSitesByMedecin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    const result = await sitesService.getSitesByMedecin(2);

    expect(result).toHaveLength(2);
    // Tri par rdvCount desc → site 1 (2 RDV) avant site 2 (1 RDV)
    expect(result[0].id).toBe(1);
    expect(result[0].rdvCount).toBe(2);
    expect(result[0].rdvUpcomingCount).toBe(1);
    expect(result[0].vacationCount).toBe(3);
    expect([...result[0].modalites].sort()).toEqual(['CT', 'MRI']);
    expect(result[1].id).toBe(2);
    expect(result[1].rdvCount).toBe(1);
  });
});
