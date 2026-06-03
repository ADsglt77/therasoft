import { prisma } from '../../../lib/prisma';

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

/**
 * Service de gestion des rendez-vous
 */
export class RdvService {
  async getRdvsByDateRange(
    medecinId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<RdvResponse[]> {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return prisma.rdv.findMany({
      where: {
        date: { gte: start, lte: end },
        vacationLinks: { some: { vacation: { medecinId } } },
      },
      select: rdvSelect,
      orderBy: [{ date: 'asc' }, { heureDebut: 'asc' }],
    });
  }

  /**
   * RDV du médecin pour une date (via liaison RDV ↔ vacation, même modalité).
   */
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

export const rdvService = new RdvService();
