import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';

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
   * Vérifie que le RDV est lié au médecin connecté via Modalite → Vacation → medecinId.
   * Retourne 403 si le médecin n'est pas propriétaire du RDV.
   */
  private async verifyRdvOwnership(rdvId: number, medecinId: number): Promise<void> {
    const link = await prisma.modalite.findFirst({
      where: {
        rdvId,
        vacation: { medecinId },
      },
    });

    if (!link) {
      throw new ApiError(
        'Accès refusé : ce rendez-vous ne vous appartient pas',
        'FORBIDDEN',
        403
      );
    }
  }

  /**
   * Récupère le dossier médical d'un patient pour un RDV spécifique
   * La contrainte unique patientId_rdvId garantit que le RDV appartient au patient
   */
  async getDossierByPatientAndRdv(
    patientId: number,
    rdvId: number,
    medecinId: number
  ): Promise<DossierResponse> {
    await this.verifyRdvOwnership(rdvId, medecinId);

    const dossier = await prisma.dossier.findUnique({
      where: {
        patientId_rdvId: { patientId, rdvId },
      },
      select: {
        id: true,
        observations: true,
        resultats: true,
        documents: true,
        createdAt: true,
        updatedAt: true,
        files: {
          select: {
            id: true,
            originalName: true,
            storedName: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        patient: {
          select: { id: true, nom: true, prenom: true, dateNaissance: true, sexe: true },
        },
        rdv: {
          select: { id: true, date: true, heureDebut: true, heureFin: true, modalite: true },
        },
      },
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
    await this.verifyRdvOwnership(rdvId, medecinId);

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
      select: {
        id: true,
        observations: true,
        resultats: true,
        documents: true,
        createdAt: true,
        updatedAt: true,
        files: {
          select: {
            id: true,
            originalName: true,
            storedName: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        patient: {
          select: { id: true, nom: true, prenom: true, dateNaissance: true, sexe: true },
        },
        rdv: {
          select: { id: true, date: true, heureDebut: true, heureFin: true, modalite: true },
        },
      },
    });

    return updatedDossier;
  }
}

export const patientService = new PatientService();
