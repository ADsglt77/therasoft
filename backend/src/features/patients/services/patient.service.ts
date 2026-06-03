import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';
import {
  assertPatientOwnsRdv,
  verifyRdvOwnership,
  dossierSelect,
} from './dossier.shared';

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

type DossierRow = Prisma.DossierGetPayload<{ select: typeof dossierSelect }>;

function mapDossier(dossier: DossierRow): DossierResponse {
  const { rdv, ...rest } = dossier;
  return {
    ...rest,
    patient: rdv.patient,
    rdv: {
      id: rdv.id,
      date: rdv.date,
      heureDebut: rdv.heureDebut,
      heureFin: rdv.heureFin,
      modalite: rdv.modalite,
    },
  };
}

/**
 * Service de gestion des patients et dossiers
 */
export class PatientService {
  async getDossierByPatientAndRdv(
    patientId: number,
    rdvId: number,
    medecinId: number
  ): Promise<DossierResponse> {
    await assertPatientOwnsRdv(patientId, rdvId);
    await verifyRdvOwnership(rdvId, medecinId);

    const dossier = await prisma.dossier.findUnique({
      where: { rdvId },
      select: dossierSelect,
    });

    if (!dossier) {
      throw new ApiError('Dossier médical non trouvé pour ce rendez-vous', 'NOT_FOUND', 404);
    }

    return mapDossier(dossier);
  }

  async updateObservations(
    patientId: number,
    rdvId: number,
    observations: string | null,
    medecinId: number
  ): Promise<DossierResponse> {
    await assertPatientOwnsRdv(patientId, rdvId);
    await verifyRdvOwnership(rdvId, medecinId);

    const existingDossier = await prisma.dossier.findUnique({
      where: { rdvId },
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

    return mapDossier(updatedDossier);
  }
}

export const patientService = new PatientService();
