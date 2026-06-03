import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';

export async function assertPatientOwnsRdv(patientId: number, rdvId: number): Promise<void> {
  const rdv = await prisma.rdv.findUnique({
    where: { id: rdvId },
    select: { patientId: true },
  });

  if (!rdv || rdv.patientId !== patientId) {
    throw new ApiError('Rendez-vous non trouvé pour ce patient', 'NOT_FOUND', 404);
  }
}

export async function verifyRdvOwnership(rdvId: number, medecinId: number): Promise<void> {
  const link = await prisma.rdvVacation.findFirst({
    where: { rdvId, vacation: { medecinId } },
  });

  if (!link) {
    throw new ApiError('Accès refusé : ce rendez-vous ne vous appartient pas', 'FORBIDDEN', 403);
  }
}

export async function assertDossierAccess(
  patientId: number,
  rdvId: number,
  medecinId: number
): Promise<void> {
  await assertPatientOwnsRdv(patientId, rdvId);
  await verifyRdvOwnership(rdvId, medecinId);
}

export const dossierSelect = {
  id: true,
  observations: true,
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
    orderBy: { createdAt: 'desc' as const },
  },
  rdv: {
    select: {
      id: true,
      date: true,
      heureDebut: true,
      heureFin: true,
      modalite: true,
      patient: {
        select: { id: true, nom: true, prenom: true, dateNaissance: true, sexe: true },
      },
    },
  },
} satisfies Prisma.DossierSelect;
