import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';
import { assertDossierAccess, dossierSelect } from './dossier.shared';
import { syncDossierOperationReady } from './dossier-completion';

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
  operationReady: boolean;
  operationReadyAt: Date | null;
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
  const { rdv, operationReadyAt, ...rest } = dossier;
  return {
    ...rest,
    operationReady: operationReadyAt != null,
    operationReadyAt,
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

export class DossierService {
  async getDossierByPatientAndRdv(
    patientId: number,
    rdvId: number,
    medecinId: number
  ): Promise<DossierResponse> {
    await assertDossierAccess(patientId, rdvId, medecinId);

    const dossier = await prisma.dossier.findUnique({
      where: { rdvId },
      select: dossierSelect,
    });

    if (!dossier) {
      throw new ApiError('Dossier médical non trouvé pour ce rendez-vous', 'NOT_FOUND', 404);
    }

    await syncDossierOperationReady(dossier.id);
    const refreshed = await prisma.dossier.findUnique({
      where: { id: dossier.id },
      select: dossierSelect,
    });

    return mapDossier(refreshed!);
  }

  async updateObservations(
    patientId: number,
    rdvId: number,
    observations: string | null,
    medecinId: number
  ): Promise<DossierResponse> {
    await assertDossierAccess(patientId, rdvId, medecinId);

    const existingDossier = await prisma.dossier.findUnique({
      where: { rdvId },
    });

    if (!existingDossier) {
      throw new ApiError('Dossier médical non trouvé pour ce rendez-vous', 'NOT_FOUND', 404);
    }

    await prisma.dossier.update({
      where: { id: existingDossier.id },
      data: { observations },
    });

    await syncDossierOperationReady(existingDossier.id);

    const updatedDossier = await prisma.dossier.findUnique({
      where: { id: existingDossier.id },
      select: dossierSelect,
    });

    return mapDossier(updatedDossier!);
  }
}

export const dossierService = new DossierService();
