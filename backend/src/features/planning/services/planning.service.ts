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

export interface RdvResponse {
  id: number;
  date: Date;
  heureDebut: Date;
  heureFin: Date;
  modalite: string;
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
  patient: {
    select: {
      id: true,
      nom: true,
      prenom: true,
    },
  },
} as const;

export class PlanningService {
  async getVacationsByMedecin(
    medecinId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<VacationResponse[]> {
    const { start, end } = getDefaultMonthRange();
    const rangeStart = startDate ?? start;
    const rangeEnd = endDate ?? end;

    return prisma.vacation.findMany({
      where: {
        medecinId,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: {
        id: true,
        date: true,
        horaire: true,
        site: true,
        ville: true,
        modalite: true,
      },
      orderBy: { date: 'asc' },
    });
  }

  async getRdvsByDateRange(
    medecinId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<RdvResponse[]> {
    const { start, end } = getDefaultMonthRange();
    const rangeStart = startDate ?? start;
    const rangeEnd = endDate ?? end;

    return prisma.rdv.findMany({
      where: {
        date: { gte: rangeStart, lte: rangeEnd },
        vacationLinks: { some: { vacation: { medecinId } } },
      },
      select: rdvSelect,
      orderBy: [{ date: 'asc' }, { heureDebut: 'asc' }],
    });
  }

  async getRdvsByMedecinAndDate(medecinId: number, date: Date): Promise<RdvResponse[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.rdv.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        vacationLinks: { some: { vacation: { medecinId } } },
      },
      select: rdvSelect,
      orderBy: { heureDebut: 'asc' },
    });
  }
}

export const planningService = new PlanningService();
