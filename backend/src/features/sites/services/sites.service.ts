import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { parisDateKey, utcDateKey } from '../../../lib/dates';
import { OpeningHour, parseOpeningHours } from '../../../lib/opening-hours';

interface SiteResponse {
  id: number;
  nom: string;
  ville: string;
  adresse: string | null;
  latitude: number | null;
  longitude: number | null;
  websiteUrl: string | null;
  openingHours: OpeningHour[];
  /** Nombre de vacations du médecin sur ce site (période complète). */
  vacationCount: number;
  /** Modalités (types d'examen) présentes sur ce site pour le médecin. */
  modalites: string[];
  /** Prochaine vacation du médecin sur ce site (YYYY-MM-DD), sinon null. */
  nextVacationDate: string | null;
  /** RDV distincts du médecin rattachés à ce site (via RdvVacation). */
  rdvCount: number;
  /** RDV distincts à venir (date >= aujourd'hui). */
  rdvUpcomingCount: number;
}

class SitesService {
  /**
   * Liste les sites où le médecin a des vacations, avec stats agrégées
   * (RDV distincts, vacations, modalités, prochaine vacation) + métadonnées.
   */
  async getSitesByMedecin(medecinId: number, q?: string): Promise<SiteResponse[]> {
    const todayKey = parisDateKey();
    const term = q?.trim();

    // Filtre : sites du médecin, éventuellement restreints à la recherche
    // (nom de site, nom de ville, ou nom/prénom d'un patient ayant un RDV sur place).
    const where: Prisma.SiteWhereInput = { vacations: { some: { medecinId } } };
    if (term) {
      where.OR = [
        { nom: { contains: term, mode: 'insensitive' } },
        { ville: { contains: term, mode: 'insensitive' } },
        {
          vacations: {
            some: {
              medecinId,
              rdvLinks: {
                some: {
                  rdv: {
                    patient: {
                      OR: [
                        { nom: { contains: term, mode: 'insensitive' } },
                        { prenom: { contains: term, mode: 'insensitive' } },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        {
          rdvs: {
            some: {
              medecinId,
              patient: {
                OR: [
                  { nom: { contains: term, mode: 'insensitive' } },
                  { prenom: { contains: term, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ];
    }

    const sites = await prisma.site.findMany({
      where,
      select: {
        id: true,
        nom: true,
        ville: true,
        adresse: true,
        latitude: true,
        longitude: true,
        websiteUrl: true,
        openingHours: true,
        vacations: {
          where: { medecinId },
          select: { modalite: true, date: true },
        },
      },
    });

    // RDV distincts par site : RdvVacation → vacation.siteId
    const [rdvLinks, directRdvs] = await Promise.all([
      prisma.rdvVacation.findMany({
        where: { vacation: { medecinId } },
        select: {
          rdvId: true,
          vacation: { select: { siteId: true } },
          rdv: { select: { date: true } },
        },
      }),
      prisma.rdv.findMany({
        where: { medecinId, siteId: { not: null } },
        select: { id: true, siteId: true, date: true },
      }),
    ]);

    const allBySite = new Map<number, Set<number>>();
    const upcomingBySite = new Map<number, Set<number>>();
    for (const link of rdvLinks) {
      const siteId = link.vacation.siteId;
      (allBySite.get(siteId) ?? allBySite.set(siteId, new Set()).get(siteId)!).add(link.rdvId);
      if (utcDateKey(link.rdv.date) >= todayKey) {
        (upcomingBySite.get(siteId) ?? upcomingBySite.set(siteId, new Set()).get(siteId)!).add(
          link.rdvId
        );
      }
    }
    for (const rdv of directRdvs) {
      if (rdv.siteId == null) continue;
      (allBySite.get(rdv.siteId) ?? allBySite.set(rdv.siteId, new Set()).get(rdv.siteId)!).add(
        rdv.id
      );
      if (utcDateKey(rdv.date) >= todayKey) {
        (
          upcomingBySite.get(rdv.siteId) ??
          upcomingBySite.set(rdv.siteId, new Set()).get(rdv.siteId)!
        ).add(rdv.id);
      }
    }

    const result: SiteResponse[] = sites.map((site) => {
      const modalites = [...new Set(site.vacations.map((v) => v.modalite as string))];
      const nextVacationDate =
        site.vacations
          .map((v) => utcDateKey(v.date))
          .filter((k) => k >= todayKey)
          .sort()[0] ?? null;

      return {
        id: site.id,
        nom: site.nom,
        ville: site.ville,
        adresse: site.adresse,
        latitude: site.latitude,
        longitude: site.longitude,
        websiteUrl: site.websiteUrl,
        openingHours: parseOpeningHours(site.openingHours),
        vacationCount: site.vacations.length,
        modalites,
        nextVacationDate,
        rdvCount: allBySite.get(site.id)?.size ?? 0,
        rdvUpcomingCount: upcomingBySite.get(site.id)?.size ?? 0,
      };
    });

    result.sort((a, b) => b.rdvCount - a.rdvCount);
    return result;
  }
}

export const sitesService = new SitesService();
