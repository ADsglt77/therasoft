import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';

/** Créneau horaire d'ouverture (jour 1 = lundi … 7 = dimanche). */
export interface OpeningHour {
  day: number;
  open: string; // "HH:mm"
  close: string; // "HH:mm"
}

export interface SiteResponse {
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

function toDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export class SitesService {
  /**
   * Liste les sites où le médecin a des vacations, avec stats agrégées
   * (RDV distincts, vacations, modalités, prochaine vacation) + métadonnées.
   */
  async getSitesByMedecin(medecinId: number, q?: string): Promise<SiteResponse[]> {
    const todayKey = toDateKey(new Date());
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
    const rdvLinks = await prisma.rdvVacation.findMany({
      where: { vacation: { medecinId } },
      select: {
        rdvId: true,
        vacation: { select: { siteId: true } },
        rdv: { select: { date: true } },
      },
    });

    const allBySite = new Map<number, Set<number>>();
    const upcomingBySite = new Map<number, Set<number>>();
    for (const link of rdvLinks) {
      const siteId = link.vacation.siteId;
      (allBySite.get(siteId) ?? allBySite.set(siteId, new Set()).get(siteId)!).add(link.rdvId);
      if (toDateKey(link.rdv.date) >= todayKey) {
        (upcomingBySite.get(siteId) ?? upcomingBySite.set(siteId, new Set()).get(siteId)!).add(
          link.rdvId
        );
      }
    }

    const result: SiteResponse[] = sites.map((site) => {
      const modalites = [...new Set(site.vacations.map((v) => v.modalite as string))];
      const nextVacationDate =
        site.vacations
          .map((v) => toDateKey(v.date))
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
        openingHours: (site.openingHours as unknown as OpeningHour[] | null) ?? [],
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
