import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';

/**
 * Interface pour le dossier médical retourné
 */
export interface DossierResponse {
  id: number;
  observations: string | null;
  resultats: string | null;
  documents: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: number;
    nom: string;
    prenom: string;
    dateNaissance: Date;
    sexe: string | null;
  };
  rdv: {
    id: number;
    date: Date;
    heureDebut: Date;
    heureFin: Date;
    modalite: string;
  };
}

/**
 * Service de gestion des patients et dossiers
 */
export class PatientService {
  /**
   * Récupère le dossier médical d'un patient pour un RDV spécifique
   * La contrainte unique patientId_rdvId garantit que le RDV appartient au patient
   */
  async getDossierByPatientAndRdv(
    patientId: number,
    rdvId: number
  ): Promise<DossierResponse> {
    const dossier = await prisma.dossier.findUnique({
      where: {
        patientId_rdvId: {
          patientId,
          rdvId,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            dateNaissance: true,
            sexe: true,
          },
        },
        rdv: {
          select: {
            id: true,
            date: true,
            heureDebut: true,
            heureFin: true,
            modalite: true,
          },
        },
      },
    });

    if (!dossier) {
      throw new ApiError(
        'Dossier médical non trouvé pour ce rendez-vous',
        'NOT_FOUND',
        404
      );
    }

    return dossier;
  }

  /**
   * Met à jour les observations médicales d'un dossier
   */
  async updateObservations(
    patientId: number,
    rdvId: number,
    observations: string
  ): Promise<DossierResponse> {
    // Vérifier que le dossier existe et mettre à jour en une seule opération
    try {
      const updatedDossier = await prisma.dossier.update({
        where: {
          patientId_rdvId: {
            patientId,
            rdvId,
          },
        },
        data: {
          observations,
        },
        include: {
          patient: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              dateNaissance: true,
              sexe: true,
            },
          },
          rdv: {
            select: {
              id: true,
              date: true,
              heureDebut: true,
              heureFin: true,
              modalite: true,
            },
          },
        },
      });

      return updatedDossier;
    } catch (error: any) {
      // Prisma throws P2025 when the record to update is not found
      if (error?.code === 'P2025') {
        throw new ApiError(
          'Dossier médical non trouvé pour ce rendez-vous',
          'NOT_FOUND',
          404
        );
      }
      throw error;
    }
  }
}

export const patientService = new PatientService();

