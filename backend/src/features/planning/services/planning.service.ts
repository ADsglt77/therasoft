import { prisma } from '../../../lib/prisma';

/**
 * Interface pour les vacations retournées
 */
export interface VacationResponse {
  id: number;
  date: Date;
  horaire: Date;
  site: string;
  ville: string;
  modalite: string;
}

/**
 * Service de planning
 */
export class PlanningService {
  /**
   * Récupère les vacations d'un médecin pour une période donnée
   */
  async getVacationsByMedecin(
    medecinId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<VacationResponse[]> {
    // Dates par défaut (mois courant)
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return prisma.vacation.findMany({
      where: {
        medecinId,
        date: { gte: start, lte: end },
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
}

export const planningService = new PlanningService();

