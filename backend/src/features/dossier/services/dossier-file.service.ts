import fs from 'fs';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';
import {
  removeDossierFiles,
  removeUploadedFiles,
  resolveDossierFile,
} from '../../../lib/dossier-storage';
import { DossierOperationStatus, syncDossierOperationReady } from './dossier-completion';
import { assertDossierAccess } from './dossier.shared';

interface DossierFileUploadResponse extends DossierOperationStatus {
  files: DossierFileResponse[];
}

interface DossierFileResponse {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

function toFileResponse(file: {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}): DossierFileResponse {
  return {
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    createdAt: file.createdAt,
  };
}

class DossierFileService {
  private async getDossierId(rdvId: number): Promise<number> {
    const dossier = await prisma.dossier.findUnique({
      where: { rdvId },
      select: { id: true },
    });
    if (!dossier) {
      throw new ApiError('Dossier medical non trouve', 'NOT_FOUND', 404);
    }
    return dossier.id;
  }

  async uploadFiles(
    patientId: number,
    rdvId: number,
    medecinId: number,
    files: Express.Multer.File[]
  ): Promise<DossierFileUploadResponse> {
    let persisted = false;
    try {
      await assertDossierAccess(patientId, rdvId, medecinId);
      const dossierId = await this.getDossierId(rdvId);
      const result = await prisma.$transaction(async (tx) => {
        const rows = await Promise.all(
          files.map((file) =>
            tx.dossierFile.create({
              data: {
                dossierId,
                originalName: file.originalname,
                storedName: file.filename,
                mimeType: file.mimetype,
                size: file.size,
              },
            })
          )
        );
        const status = await syncDossierOperationReady(dossierId, tx);
        return { rows, status };
      });
      persisted = true;

      return {
        files: result.rows.map(toFileResponse),
        ...result.status,
      };
    } catch (error) {
      if (!persisted) {
        await removeUploadedFiles(files);
      }
      throw error;
    }
  }

  async deleteFile(
    patientId: number,
    rdvId: number,
    fileId: number,
    medecinId: number
  ): Promise<DossierOperationStatus> {
    await assertDossierAccess(patientId, rdvId, medecinId);
    const dossierId = await this.getDossierId(rdvId);

    const file = await prisma.dossierFile.findFirst({
      where: { id: fileId, dossierId },
    });
    if (!file) {
      throw new ApiError('Fichier non trouve', 'NOT_FOUND', 404);
    }

    const status = await prisma.$transaction(async (tx) => {
      await tx.dossierFile.delete({ where: { id: fileId } });
      return syncDossierOperationReady(dossierId, tx);
    });
    await removeDossierFiles([file.storedName]);
    return status;
  }

  async getFilePath(
    patientId: number,
    rdvId: number,
    fileId: number,
    medecinId: number
  ): Promise<{ absolutePath: string; originalName: string; mimeType: string }> {
    await assertDossierAccess(patientId, rdvId, medecinId);
    const dossierId = await this.getDossierId(rdvId);

    const file = await prisma.dossierFile.findFirst({
      where: { id: fileId, dossierId },
    });
    if (!file) {
      throw new ApiError('Fichier non trouve', 'NOT_FOUND', 404);
    }

    const absolutePath = resolveDossierFile(file.storedName);
    if (!fs.existsSync(absolutePath)) {
      throw new ApiError('Fichier introuvable sur le disque', 'NOT_FOUND', 404);
    }

    return { absolutePath, originalName: file.originalName, mimeType: file.mimeType };
  }
}

export const dossierFileService = new DossierFileService();
