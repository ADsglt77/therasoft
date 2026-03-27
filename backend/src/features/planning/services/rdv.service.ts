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
  typeIcon: string | null;
  typeDescription: string | null;
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
        links: { some: { vacation: { medecinId } } },
      },
      select: {
        id: true,
        date: true,
        heureDebut: true,
        heureFin: true,
        modalite: true,
        typeIcon: true,
        typeDescription: true,
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
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.rdv.findMany({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      select: {
        id: true,
        date: true,
        heureDebut: true,
        heureFin: true,
        modalite: true,
        typeIcon: true,
        typeDescription: true,
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

  /**
   * Récupère les rendez-vous d'un médecin pour une date spécifique
   * Les rendez-vous sont liés au médecin via Modalite -> Vacation -> Medecin
   */
  async getRdvsByMedecinAndDate(
    medecinId: number,
    date: Date
  ): Promise<RdvResponse[]> {
    // Normaliser la date (début et fin de journée)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.rdv.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        links: {
          some: {
            vacation: {
              medecinId: medecinId,
            },
          },
        },
      },
      select: {
        id: true,
        date: true,
        heureDebut: true,
        heureFin: true,
        modalite: true,
        typeIcon: true,
        typeDescription: true,
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

