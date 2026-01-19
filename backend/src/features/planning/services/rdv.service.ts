import { prisma } from '../../../lib/prisma';

/**
 * Interface pour les rendez-vous retournés
 */
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

/**
 * Service de gestion des rendez-vous
 */
export class RdvService {
  /**
   * Récupère les rendez-vous pour une période donnée
   */
  async getRdvsByDateRange(
    startDate?: Date,
    endDate?: Date
  ): Promise<RdvResponse[]> {
    // Dates par défaut (mois courant)
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return prisma.rdv.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      select: {
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
      },
      orderBy: [
        { date: 'asc' },
        { heureDebut: 'asc' },
      ],
    });
  }

  /**
   * Récupère les rendez-vous pour une date spécifique
   */
  async getRdvsByDate(date: Date): Promise<RdvResponse[]> {
    return prisma.rdv.findMany({
      where: {
        date: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
      },
      select: {
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
      },
      orderBy: {
        heureDebut: 'asc',
      },
    });
  }
}

export const rdvService = new RdvService();

