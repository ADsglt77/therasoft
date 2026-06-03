import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';
import { verifyRdvOwnership, dossierSelect } from './dossier.shared';

export interface DossierFileInfo {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface DossierResponse {
  id: number;
  observations: string | null;
  resultats: string | null;
  documents: string | null;
  createdAt: Date;
  updatedAt: Date;
  files: DossierFileInfo[];
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
    rdvId: number,
    medecinId: number
  ): Promise<DossierResponse> {
    await verifyRdvOwnership(rdvId, medecinId);

    const dossier = await prisma.dossier.findUnique({
      where: {
        patientId_rdvId: { patientId, rdvId },
      },
      select: dossierSelect,
    });

    if (!dossier) {
      throw new ApiError('Dossier médical non trouvé pour ce rendez-vous', 'NOT_FOUND', 404);
    }

    return dossier;
  }

  /**
   * Met à jour les observations médicales d'un dossier
   */
  async updateObservations(
    patientId: number,
    rdvId: number,
    observations: string | null,
    medecinId: number
  ): Promise<DossierResponse> {
    await verifyRdvOwnership(rdvId, medecinId);

    const existingDossier = await prisma.dossier.findUnique({
      where: {
        patientId_rdvId: {
          patientId,
          rdvId,
        },
      },
    });

    if (!existingDossier) {
      throw new ApiError(
        'Dossier médical non trouvé pour ce rendez-vous',
        'NOT_FOUND',
        404
      );
    }

    const updatedDossier = await prisma.dossier.update({
      where: { id: existingDossier.id },
      data: { observations },
      select: dossierSelect,
    });

    return updatedDossier;
  }
}

export const patientService = new PatientService();
