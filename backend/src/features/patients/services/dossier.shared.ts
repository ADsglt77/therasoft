import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';

/**
 * Vérifie que le RDV est lié au médecin connecté via Modalite → Vacation → medecinId.
 * Lève une 403 si le médecin n'est pas propriétaire du RDV.
 * Helper partagé par patient.service et dossier-file.service.
 */
export async function verifyRdvOwnership(rdvId: number, medecinId: number): Promise<void> {
  const link = await prisma.modalite.findFirst({
    where: { rdvId, vacation: { medecinId } },
  });

  if (!link) {
    throw new ApiError('Accès refusé : ce rendez-vous ne vous appartient pas', 'FORBIDDEN', 403);
  }
}

/**
 * Sélection Prisma commune pour la lecture d'un dossier (lecture et mise à jour).
 */
export const dossierSelect = {
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
    orderBy: { createdAt: 'desc' as const },
  },
  patient: {
    select: { id: true, nom: true, prenom: true, dateNaissance: true, sexe: true },
  },
  rdv: {
    select: { id: true, date: true, heureDebut: true, heureFin: true, modalite: true },
  },
} satisfies Prisma.DossierSelect;
