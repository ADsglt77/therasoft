import { prisma } from '../../../lib/prisma';

export function isDossierOperationReady(
  observations: string | null,
  fileCount: number
): boolean {
  return Boolean(observations?.trim()) && fileCount > 0;
}

export async function syncDossierOperationReady(dossierId: number): Promise<void> {
  const dossier = await prisma.dossier.findUnique({
    where: { id: dossierId },
    select: {
      observations: true,
      operationReadyAt: true,
      _count: { select: { files: true } },
    },
  });

  if (!dossier) {
    return;
  }

  const ready = isDossierOperationReady(dossier.observations, dossier._count.files);

  if (ready && !dossier.operationReadyAt) {
    await prisma.dossier.update({
      where: { id: dossierId },
      data: { operationReadyAt: new Date() },
    });
    return;
  }

  if (!ready && dossier.operationReadyAt) {
    await prisma.dossier.update({
      where: { id: dossierId },
      data: { operationReadyAt: null },
    });
  }
}
