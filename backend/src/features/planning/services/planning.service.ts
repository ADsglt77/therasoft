import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { getDefaultMonthRange } from '../../../lib/dates';

interface VacationResponse {
  id: number;
  date: Date;
  horaire: Date;
  site: string;
  ville: string;
  modalite: string;
}

interface DossierPlanningStatus {
  hasObservations: boolean;
  fileCount: number;
  operationReady: boolean;
  verified: boolean;
}

interface RdvResponse {
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

function mapDossierStatus(dossier: RdvRow['dossier']): DossierPlanningStatus {
  return {
    hasObservations: Boolean(dossier?.observations?.trim()),
    fileCount: dossier?._count.files ?? 0,
    operationReady: dossier?.operationReadyAt != null,
    verified: dossier?.verified ?? false,
  };
}

function mapRdv(rdv: RdvRow): RdvResponse {
  const { dossier, ...rest } = rdv;
  return { ...rest, dossierStatus: mapDossierStatus(dossier) };
}

class PlanningService {
  async getVacationsByMedecin(
    medecinId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<VacationResponse[]> {
    const { start, end } = getDefaultMonthRange();
    const rows = await prisma.vacation.findMany({
      where: {
        medecinId,
        date: { gte: startDate ?? start, lte: endDate ?? end },
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
    return this.findRdvs(this.rdvWhereForMedecin(medecinId, startDate ?? start, endDate ?? end), [
      { date: 'asc' },
      { heureDebut: 'asc' },
    ]);
  }

  async getRdvsByMedecinAndDate(medecinId: number, date: Date): Promise<RdvResponse[]> {
    return this.findRdvs(this.rdvWhereForMedecin(medecinId, date, date), {
      heureDebut: 'asc',
    });
  }

  /** RDV d'un médecin sur une période : réservés directement OU liés via une vacation. */
  private rdvWhereForMedecin(
    medecinId: number,
    rangeStart: Date,
    rangeEnd: Date
  ): Prisma.RdvWhereInput {
    return {
      date: { gte: rangeStart, lte: rangeEnd },
      OR: [{ vacationLinks: { some: { vacation: { medecinId } } } }, { medecinId }],
    };
  }

  private async findRdvs(
    where: Prisma.RdvWhereInput,
    orderBy: Prisma.RdvOrderByWithRelationInput | Prisma.RdvOrderByWithRelationInput[]
  ): Promise<RdvResponse[]> {
    const rows = await prisma.rdv.findMany({ where, select: rdvSelect, orderBy });
    return rows.map(mapRdv);
  }
}

export const planningService = new PlanningService();
