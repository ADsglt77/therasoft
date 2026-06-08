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
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
  files: DossierFileInfo[];
  patient: {
    id: number;
    nom: string;
    prenom: string;
    dateNaissance: Date | null;
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
    const dossierId = await this.requireDossierId(patientId, rdvId, medecinId);
    await syncDossierOperationReady(dossierId);
    return this.loadMapped(dossierId);
  }

  async updateObservations(
    patientId: number,
    rdvId: number,
    observations: string | null,
    medecinId: number
  ): Promise<DossierResponse> {
    const dossierId = await this.requireDossierId(patientId, rdvId, medecinId);
    await prisma.dossier.update({ where: { id: dossierId }, data: { observations } });
    await syncDossierOperationReady(dossierId);
    return this.loadMapped(dossierId);
  }

  async setVerified(
    patientId: number,
    rdvId: number,
    verified: boolean,
    medecinId: number
  ): Promise<DossierResponse> {
    const dossierId = await this.requireDossierId(patientId, rdvId, medecinId);
    await prisma.dossier.update({ where: { id: dossierId }, data: { verified } });
    return this.loadMapped(dossierId);
  }

  /** Vérifie l'accès médecin→dossier et renvoie l'id du dossier du RDV (404 sinon). */
  private async requireDossierId(
    patientId: number,
    rdvId: number,
    medecinId: number
  ): Promise<number> {
    await assertDossierAccess(patientId, rdvId, medecinId);
    const dossier = await prisma.dossier.findUnique({ where: { rdvId }, select: { id: true } });
    if (!dossier) {
      throw new ApiError('Dossier médical non trouvé pour ce rendez-vous', 'NOT_FOUND', 404);
    }
    return dossier.id;
  }

  /** Recharge le dossier complet (projection dossierSelect) et le mappe en réponse. */
  private async loadMapped(dossierId: number): Promise<DossierResponse> {
    const dossier = await prisma.dossier.findUnique({
      where: { id: dossierId },
      select: dossierSelect,
    });
    return mapDossier(dossier!);
  }
}

export const dossierService = new DossierService();
