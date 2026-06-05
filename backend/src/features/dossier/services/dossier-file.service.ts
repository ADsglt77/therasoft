import path from 'path';
import fs from 'fs';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';
import { UPLOADS_ROOT } from '../../../middlewares/upload';
import { assertDossierAccess, assertPatientOwnsRdv } from './dossier.shared';
import { syncDossierOperationReady } from './dossier-completion';

export interface DossierFileUploadResponse {
  files: DossierFileResponse[];
  operationReady: boolean;
  operationReadyAt: Date | null;
}

export interface DossierOperationStatus {
  operationReady: boolean;
  operationReadyAt: Date | null;
}

export interface DossierFileResponse {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  url: string;
}

function toFileResponse(
  file: {
    id: number;
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    createdAt: Date;
  },
  patientId: number,
  rdvId: number
): DossierFileResponse {
  return {
    ...file,
    url: `/api/patients/${patientId}/rdv/${rdvId}/dossier/files/${file.id}/download`,
  };
}

class DossierFileService {
  private async getDossierOperationStatus(dossierId: number): Promise<DossierOperationStatus> {
    const dossier = await prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { operationReadyAt: true },
    });
    return {
      operationReady: dossier?.operationReadyAt != null,
      operationReadyAt: dossier?.operationReadyAt ?? null,
    };
  }

  private async getDossierId(patientId: number, rdvId: number): Promise<number> {
    await assertPatientOwnsRdv(patientId, rdvId);
    const dossier = await prisma.dossier.findUnique({
      where: { rdvId },
      select: { id: true },
    });
    if (!dossier) {
      throw new ApiError('Dossier médical non trouvé', 'NOT_FOUND', 404);
    }
    return dossier.id;
  }

  async uploadFiles(
    patientId: number,
    rdvId: number,
    medecinId: number,
    files: Express.Multer.File[]
  ): Promise<DossierFileUploadResponse> {
    await assertDossierAccess(patientId, rdvId, medecinId);
    const dossierId = await this.getDossierId(patientId, rdvId);

    const created = await Promise.all(
      files.map((f) =>
        prisma.dossierFile.create({
          data: {
            dossierId,
            originalName: f.originalname,
            storedName: f.filename,
            mimeType: f.mimetype,
            size: f.size,
          },
        })
      )
    );

    await syncDossierOperationReady(dossierId);
    const status = await this.getDossierOperationStatus(dossierId);

    return {
      files: created.map((f) => toFileResponse(f, patientId, rdvId)),
      ...status,
    };
  }

  async deleteFile(
    patientId: number,
    rdvId: number,
    fileId: number,
    medecinId: number
  ): Promise<DossierOperationStatus> {
    await assertDossierAccess(patientId, rdvId, medecinId);
    const dossierId = await this.getDossierId(patientId, rdvId);

    const file = await prisma.dossierFile.findFirst({
      where: { id: fileId, dossierId },
    });
    if (!file) {
      throw new ApiError('Fichier non trouvé', 'NOT_FOUND', 404);
    }

    const filePath = path.join(UPLOADS_ROOT, file.storedName);
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Le fichier physique a peut-être déjà été supprimé
    }

    await prisma.dossierFile.delete({ where: { id: fileId } });
    await syncDossierOperationReady(dossierId);
    return this.getDossierOperationStatus(dossierId);
  }

  async getFilePath(
    patientId: number,
    rdvId: number,
    fileId: number,
    medecinId: number
  ): Promise<{ absolutePath: string; originalName: string; mimeType: string }> {
    await assertDossierAccess(patientId, rdvId, medecinId);
    const dossierId = await this.getDossierId(patientId, rdvId);

    const file = await prisma.dossierFile.findFirst({
      where: { id: fileId, dossierId },
    });
    if (!file) {
      throw new ApiError('Fichier non trouvé', 'NOT_FOUND', 404);
    }

    const absolutePath = path.join(UPLOADS_ROOT, file.storedName);
    if (!fs.existsSync(absolutePath)) {
      throw new ApiError('Fichier introuvable sur le disque', 'NOT_FOUND', 404);
    }

    return { absolutePath, originalName: file.originalName, mimeType: file.mimeType };
  }
}

export const dossierFileService = new DossierFileService();
