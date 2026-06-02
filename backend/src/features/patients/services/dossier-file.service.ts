import path from 'path';
import fs from 'fs';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';
import { UPLOADS_ROOT } from '../../../middlewares/upload';

export interface DossierFileResponse {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  url: string;
}

function toFileResponse(file: {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}): DossierFileResponse {
  return {
    ...file,
    url: `/uploads/dossiers/${file.storedName}`,
  };
}

class DossierFileService {
  private async verifyRdvOwnership(rdvId: number, medecinId: number): Promise<void> {
    const link = await prisma.modalite.findFirst({
      where: { rdvId, vacation: { medecinId } },
    });
    if (!link) {
      throw new ApiError('Accès refusé : ce rendez-vous ne vous appartient pas', 'FORBIDDEN', 403);
    }
  }

  private async getDossierId(patientId: number, rdvId: number): Promise<number> {
    const dossier = await prisma.dossier.findUnique({
      where: { patientId_rdvId: { patientId, rdvId } },
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
  ): Promise<DossierFileResponse[]> {
    await this.verifyRdvOwnership(rdvId, medecinId);
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

    return created.map(toFileResponse);
  }

  async deleteFile(
    patientId: number,
    rdvId: number,
    fileId: number,
    medecinId: number
  ): Promise<void> {
    await this.verifyRdvOwnership(rdvId, medecinId);
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
  }

  async getFilePath(
    patientId: number,
    rdvId: number,
    fileId: number,
    medecinId: number
  ): Promise<{ absolutePath: string; originalName: string; mimeType: string }> {
    await this.verifyRdvOwnership(rdvId, medecinId);
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
