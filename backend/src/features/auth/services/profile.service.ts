import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';
import { UpdateProfileInput, UpdateAvatarInput } from '../schemas/auth.schemas';

const medecinSelect = {
  id: true,
  nom: true,
  prenom: true,
  specialite: true,
  isActive: true,
  user: { select: { email: true, image: true, role: true } },
} as const;

const patientSelect = {
  id: true,
  nom: true,
  prenom: true,
  adresse: true,
  user: { select: { email: true, emailVerified: true, role: true } },
  medecin: { select: { id: true, nom: true, prenom: true, specialite: true } },
} as const;

export class ProfileService {
  async getMedecin(medecinId: number) {
    const medecin = await prisma.medecin.findUnique({
      where: { id: medecinId },
      select: medecinSelect,
    });
    if (!medecin) throw new ApiError('Médecin introuvable', 'AUTH_MEDECIN_NOT_FOUND', 404);
    
    // Flatten for retro-compatibility
    return {
      ...medecin,
      email: medecin.user?.email,
      avatarUrl: medecin.user?.image,
      role: medecin.user?.role || 'MEDECIN',
    };
  }

  async updateMedecin(medecinId: number, input: UpdateProfileInput) {
    const medecin = await prisma.medecin.findUnique({ where: { id: medecinId }, select: { id: true, userId: true } });
    if (!medecin) throw new ApiError('Médecin introuvable', 'AUTH_MEDECIN_NOT_FOUND', 404);

    const updateData: any = {};
    if (input.nom !== undefined) updateData.nom = input.nom;
    if (input.prenom !== undefined) updateData.prenom = input.prenom;
    if (input.specialite !== undefined) updateData.specialite = input.specialite;

    if (Object.keys(updateData).length > 0) {
      await prisma.medecin.update({ where: { id: medecinId }, data: updateData });
    }
    
    // Update name in User table too
    if (input.nom !== undefined || input.prenom !== undefined) {
       const m = await prisma.medecin.findUnique({ where: { id: medecinId } });
       if (m) {
         await prisma.user.update({
           where: { id: m.userId },
           data: { name: `${m.nom} ${m.prenom}`.trim() }
         });
       }
    }

    return this.getMedecin(medecinId);
  }

  async updateAvatar(medecinId: number, input: UpdateAvatarInput) {
    const medecin = await prisma.medecin.findUnique({ where: { id: medecinId }, select: { id: true, userId: true } });
    if (!medecin) throw new ApiError('Médecin introuvable', 'AUTH_MEDECIN_NOT_FOUND', 404);

    await prisma.user.update({
      where: { id: medecin.userId },
      data: { image: input.avatarUrl || null }
    });

    return this.getMedecin(medecinId);
  }

  async getPatient(patientId: number) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: patientSelect,
    });
    if (!patient) throw new ApiError('Patient introuvable', 'AUTH_PATIENT_NOT_FOUND', 404);
    
    return {
      ...patient,
      email: patient.user?.email,
      emailVerified: patient.user?.emailVerified,
      role: patient.user?.role || 'PATIENT',
    };
  }

  async updatePatient(patientId: number, input: UpdateProfileInput) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, userId: true } });
    if (!patient) throw new ApiError('Patient introuvable', 'AUTH_PATIENT_NOT_FOUND', 404);

    const updateData: any = {};
    if (input.nom !== undefined) updateData.nom = input.nom;
    if (input.prenom !== undefined) updateData.prenom = input.prenom;
    // @ts-ignore (since we don't have the full type here but we know it can be passed)
    if (input.adresse !== undefined) updateData.adresse = input.adresse;
    // @ts-ignore
    if (input.medecinId !== undefined) updateData.medecinId = input.medecinId;

    if (Object.keys(updateData).length > 0) {
      await prisma.patient.update({ where: { id: patientId }, data: updateData });
    }
    
    if (input.nom !== undefined || input.prenom !== undefined) {
       const p = await prisma.patient.findUnique({ where: { id: patientId } });
       if (p && p.userId) {
         await prisma.user.update({
           where: { id: p.userId },
           data: { name: `${p.nom} ${p.prenom}`.trim() }
         });
       }
    }

    return this.getPatient(patientId);
  }
}

export const profileService = new ProfileService();
