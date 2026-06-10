import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';
import {
  UpdateAvatarInput,
  UpdateMedecinProfileInput,
  UpdatePatientProfileInput,
} from '../schemas/auth.schemas';
import { addressService } from './address.service';

const medecinSelect = {
  id: true,
  nom: true,
  prenom: true,
  isActive: true,
  user: { select: { email: true, image: true, role: true } },
} as const;

const patientSelect = {
  id: true,
  nom: true,
  prenom: true,
  dateNaissance: true,
  sexe: true,
  adresse: true,
  user: { select: { email: true, emailVerified: true, role: true } },
  medecin: { select: { id: true, nom: true, prenom: true } },
} as const;

class ProfileService {
  async getMedecin(medecinId: number) {
    const medecin = await prisma.medecin.findUnique({
      where: { id: medecinId },
      select: medecinSelect,
    });
    if (!medecin) {
      throw new ApiError('Medecin introuvable', 'AUTH_MEDECIN_NOT_FOUND', 404);
    }

    return {
      ...medecin,
      email: medecin.user?.email,
      avatarUrl: medecin.user?.image,
      role: medecin.user?.role || 'MEDECIN',
    };
  }

  async updateMedecin(medecinId: number, input: UpdateMedecinProfileInput) {
    const medecin = await prisma.medecin.findUnique({
      where: { id: medecinId },
      select: { id: true, userId: true, nom: true, prenom: true },
    });
    if (!medecin) {
      throw new ApiError('Medecin introuvable', 'AUTH_MEDECIN_NOT_FOUND', 404);
    }

    const updateData: Prisma.MedecinUpdateInput = {};
    if (input.nom !== undefined) updateData.nom = input.nom;
    if (input.prenom !== undefined) updateData.prenom = input.prenom;

    if (Object.keys(updateData).length > 0) {
      await prisma.$transaction([
        prisma.medecin.update({ where: { id: medecinId }, data: updateData }),
        prisma.user.update({
          where: { id: medecin.userId },
          data: {
            name: `${input.nom ?? medecin.nom} ${input.prenom ?? medecin.prenom}`.trim(),
          },
        }),
      ]);
    }

    return this.getMedecin(medecinId);
  }

  async updateAvatar(medecinId: number, input: UpdateAvatarInput) {
    const medecin = await prisma.medecin.findUnique({
      where: { id: medecinId },
      select: { id: true, userId: true },
    });
    if (!medecin) {
      throw new ApiError('Medecin introuvable', 'AUTH_MEDECIN_NOT_FOUND', 404);
    }

    await prisma.user.update({
      where: { id: medecin.userId },
      data: { image: input.avatarUrl || null },
    });

    return this.getMedecin(medecinId);
  }

  async getPatient(patientId: number) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: patientSelect,
    });
    if (!patient) {
      throw new ApiError('Patient introuvable', 'AUTH_PATIENT_NOT_FOUND', 404);
    }

    return {
      ...patient,
      email: patient.user?.email,
      emailVerified: patient.user?.emailVerified,
      role: patient.user?.role || 'PATIENT',
    };
  }

  async updatePatient(patientId: number, input: UpdatePatientProfileInput) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, userId: true, nom: true, prenom: true },
    });
    if (!patient) {
      throw new ApiError('Patient introuvable', 'AUTH_PATIENT_NOT_FOUND', 404);
    }
    if (input.medecinId !== undefined) {
      const medecin = await prisma.medecin.findFirst({
        where: { id: input.medecinId, isActive: true },
        select: { id: true },
      });
      if (!medecin) {
        throw new ApiError('Medecin introuvable ou inactif', 'AUTH_MEDECIN_NOT_FOUND', 400);
      }
    }
    const verifiedAddress =
      input.adresse !== undefined ? await addressService.geocode(input.adresse) : null;
    if (input.adresse !== undefined && !verifiedAddress) {
      throw new ApiError('Adresse introuvable', 'AUTH_ADDRESS_NOT_FOUND', 400);
    }

    const updateData: Prisma.PatientUncheckedUpdateInput = {};
    if (input.nom !== undefined) updateData.nom = input.nom;
    if (input.prenom !== undefined) updateData.prenom = input.prenom;
    if (input.dateNaissance !== undefined) updateData.dateNaissance = input.dateNaissance;
    if (input.sexe !== undefined) updateData.sexe = input.sexe;
    if (verifiedAddress) {
      updateData.adresse = verifiedAddress.label;
      updateData.latitude = verifiedAddress.latitude;
      updateData.longitude = verifiedAddress.longitude;
    }
    if (input.medecinId !== undefined) updateData.medecinId = input.medecinId;

    if ((input.nom !== undefined || input.prenom !== undefined) && patient.userId) {
      await prisma.$transaction([
        prisma.patient.update({ where: { id: patientId }, data: updateData }),
        prisma.user.update({
          where: { id: patient.userId },
          data: {
            name: `${input.nom ?? patient.nom} ${input.prenom ?? patient.prenom}`.trim(),
          },
        }),
      ]);
    } else if (Object.keys(updateData).length > 0) {
      await prisma.patient.update({ where: { id: patientId }, data: updateData });
    }

    return this.getPatient(patientId);
  }
}

export const profileService = new ProfileService();
