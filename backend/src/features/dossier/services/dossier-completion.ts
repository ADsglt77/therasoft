import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';

type DossierCompletionClient = Pick<Prisma.TransactionClient, 'dossier'>;

export interface DossierOperationStatus {
  operationReady: boolean;
  operationReadyAt: Date | null;
  verified: boolean;
}

export function nextDossierOperationStatus(
  observations: string | null,
  fileCount: number,
  operationReadyAt: Date | null,
  verified: boolean,
  now = new Date()
): DossierOperationStatus {
  const operationReady = isDossierOperationReady(observations, fileCount);
  return {
    operationReady,
    operationReadyAt: operationReady ? (operationReadyAt ?? now) : null,
    verified: operationReady ? verified : false,
  };
}

export function isDossierOperationReady(observations: string | null, fileCount: number): boolean {
  return Boolean(observations?.trim()) && fileCount > 0;
}

export async function syncDossierOperationReady(
  dossierId: number,
  db: DossierCompletionClient = prisma
): Promise<DossierOperationStatus> {
  const dossier = await db.dossier.findUnique({
    where: { id: dossierId },
    select: {
      observations: true,
      operationReadyAt: true,
      verified: true,
      _count: { select: { files: true } },
    },
  });

  if (!dossier) {
    return { operationReady: false, operationReadyAt: null, verified: false };
  }

  const status = nextDossierOperationStatus(
    dossier.observations,
    dossier._count.files,
    dossier.operationReadyAt,
    dossier.verified
  );

  if (
    status.operationReadyAt !== dossier.operationReadyAt ||
    status.verified !== dossier.verified
  ) {
    const updated = await db.dossier.update({
      where: { id: dossierId },
      data: {
        operationReadyAt: status.operationReadyAt,
        verified: status.verified,
      },
      select: { operationReadyAt: true, verified: true },
    });
    return {
      operationReady: updated.operationReadyAt != null,
      operationReadyAt: updated.operationReadyAt,
      verified: updated.verified,
    };
  }

  return status;
}
