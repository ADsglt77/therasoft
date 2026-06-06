import { prisma } from '../../../lib/prisma';
import { getDefaultMonthRange } from '../../../lib/dates';

export interface VacationResponse {
  id: number;
  date: Date;
  horaire: Date;
  site: string;
  ville: string;
  modalite: string;
}

export interface DossierPlanningStatus {
  hasObservations: boolean;
  fileCount: number;
  operationReady: boolean;
  verified: boolean;
}

export interface RdvResponse {
  id: number;
  date: Date;
  heureDebut: Date;
  heureFin: Date;
  modalite: string;
  dossierStatus: DossierPlanningStatus;
  patient: {
    id: number;
    nom: string;
    prenom: string;
  };
}

const rdvSelect = {
  id: true,
  date: true,
  heureDebut: true,
  heureFin: true,
  modalite: true,
  dossier: {
    select: {
      operationReadyAt: true,
      verified: true,
      observations: true,
      _count: { select: { files: true } },
    },
  },
  patient: {
    select: {
      id: true,
      nom: true,
      prenom: true,
    },
  },
} as const;

type RdvRow = {
  id: number;
  date: Date;
  heureDebut: Date;
  heureFin: Date;
  modalite: string;
  dossier: {
    operationReadyAt: Date | null;
    verified: boolean;
    observations: string | null;
    _count: { files: number };
  } | null;
  patient: { id: number; nom: string; prenom: string };
};

function mapDossierStatus(
  dossier: RdvRow['dossier']
): DossierPlanningStatus {
  const fileCount = dossier?._count.files ?? 0;
  const hasObservations = Boolean(dossier?.observations?.trim());
  return {
    hasObservations,
    fileCount,
    operationReady: dossier?.operationReadyAt != null,
    verified: dossier?.verified ?? false,
  };
}

function mapRdv(rdv: RdvRow): RdvResponse {
  const { dossier, ...rest } = rdv;
  return {
    ...rest,
    dossierStatus: mapDossierStatus(dossier),
  };
}

export class PlanningService {
  async getVacationsByMedecin(
    medecinId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<VacationResponse[]> {
    const { start, end } = getDefaultMonthRange();
    const rangeStart = startDate ?? start;
    const rangeEnd = endDate ?? end;

    const rows = await prisma.vacation.findMany({
      where: {
        medecinId,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: {
        id: true,
        date: true,
        horaire: true,
        modalite: true,
        site: { select: { nom: true, ville: true } },
      },
      orderBy: { date: 'asc' },
    });

    return rows.map((v) => ({
      id: v.id,
      date: v.date,
      horaire: v.horaire,
      site: v.site.nom,
      ville: v.site.ville,
      modalite: v.modalite,
    }));
  }

  async getRdvsByDateRange(
    medecinId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<RdvResponse[]> {
    const { start, end } = getDefaultMonthRange();
    const rangeStart = startDate ?? start;
    const rangeEnd = endDate ?? end;

    const rows = await prisma.rdv.findMany({
      where: {
        date: { gte: rangeStart, lte: rangeEnd },
        OR: [
          { vacationLinks: { some: { vacation: { medecinId } } } },
          { medecinId },
        ],
      },
      select: rdvSelect,
      orderBy: [{ date: 'asc' }, { heureDebut: 'asc' }],
    });
    return rows.map(mapRdv);
  }

  async getRdvsByMedecinAndDate(medecinId: number, date: Date): Promise<RdvResponse[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const rows = await prisma.rdv.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        OR: [
          { vacationLinks: { some: { vacation: { medecinId } } } },
          { medecinId },
        ],
      },
      select: rdvSelect,
      orderBy: { heureDebut: 'asc' },
    });
    return rows.map(mapRdv);
  }
}

export const planningService = new PlanningService();
