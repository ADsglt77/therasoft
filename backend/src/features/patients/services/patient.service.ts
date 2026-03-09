import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';

/**
 * Interface pour le dossier médical retourné
 */
export interface AudioRecordingResponse {
  id: number;
  name: string;
  url: string;
  duration: number;
  transcript: string | null;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DossierResponse {
  id: number;
  observations: string | null;
  resultats: string | null;
  documents: string | null;
  observationsAudioUrl: string | null;
  observationsAudioDuration: number | null;
  observationsAudioTranscript: string | null;
  audioRecordings?: AudioRecordingResponse[]; // Nouveaux enregistrements multiples
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: number;
    nom: string;
    prenom: string;
    dateNaissance: Date;
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

/**
 * Service de gestion des patients et dossiers
 */
export class PatientService {
  /**
   * Récupère le dossier médical d'un patient pour un RDV spécifique
   * La contrainte unique patientId_rdvId garantit que le RDV appartient au patient
   */
  async getDossierByPatientAndRdv(
    patientId: number,
    rdvId: number
  ): Promise<DossierResponse> {
    try {
      console.log(`[PatientService] Récupération du dossier pour patient ${patientId}, rdv ${rdvId}`);
      const dossier = await prisma.dossier.findUnique({
        where: {
          patientId_rdvId: {
            patientId,
            rdvId,
          },
        },
        select: {
          id: true,
          observations: true,
          resultats: true,
          documents: true,
          observationsAudioUrl: true,
          observationsAudioDuration: true,
          observationsAudioTranscript: true,
          audioRecordings: {
            select: {
              id: true,
              name: true,
              url: true,
              duration: true,
              transcript: true,
              mimeType: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          createdAt: true,
          updatedAt: true,
          patient: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              dateNaissance: true,
              sexe: true,
            },
          },
          rdv: {
            select: {
              id: true,
              date: true,
              heureDebut: true,
              heureFin: true,
              modalite: true,
            },
          },
        },
      });

      if (!dossier) {
        throw new ApiError(
          'Dossier médical non trouvé pour ce rendez-vous',
          'NOT_FOUND',
          404
        );
      }

      console.log(`[PatientService] Dossier trouvé: ${JSON.stringify(dossier, null, 2)}`);
      return dossier;
    } catch (error: any) {
      console.error(`[PatientService] Erreur lors de la récupération du dossier:`, error);
      throw error;
    }
  }

  /**
   * Met à jour les observations médicales d'un dossier
   */
  async updateObservations(
    patientId: number,
    rdvId: number,
    observations: string | null
  ): Promise<DossierResponse> {
    // Vérifier que le dossier existe
    const existingDossier = await prisma.dossier.findUnique({
      where: {
        patientId_rdvId: {
          patientId,
          rdvId,
        },
      },
    });

    if (!existingDossier) {
      throw new ApiError(
        'Dossier médical non trouvé pour ce rendez-vous',
        'NOT_FOUND',
        404
      );
    }

    // Mettre à jour les observations
    const updatedDossier = await prisma.dossier.update({
      where: {
        id: existingDossier.id,
      },
      data: {
        observations: observations, // null ou string non vide (validé par Zod)
      },
      select: {
        id: true,
        observations: true,
        resultats: true,
        documents: true,
        observationsAudioUrl: true,
        observationsAudioDuration: true,
        observationsAudioTranscript: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            dateNaissance: true,
            sexe: true,
          },
        },
        rdv: {
          select: {
            id: true,
            date: true,
            heureDebut: true,
            heureFin: true,
            modalite: true,
          },
        },
      },
    });

    return updatedDossier;
  }

  /**
   * Met à jour l'enregistrement audio des observations
   */
  async updateAudioRecording(
    patientId: number,
    rdvId: number,
    audioUrl: string,
    duration: number,
    transcript?: string
  ): Promise<DossierResponse> {
    // Vérifier que le dossier existe
    const existingDossier = await prisma.dossier.findUnique({
      where: {
        patientId_rdvId: {
          patientId,
          rdvId,
        },
      },
    });

    if (!existingDossier) {
      throw new ApiError(
        'Dossier médical non trouvé pour ce rendez-vous',
        'NOT_FOUND',
        404
      );
    }

    // Mettre à jour l'enregistrement audio
    const updatedDossier = await prisma.dossier.update({
      where: {
        id: existingDossier.id,
      },
      data: {
        observationsAudioUrl: audioUrl,
        observationsAudioDuration: duration,
        observationsAudioTranscript: transcript || null,
      },
      select: {
        id: true,
        observations: true,
        resultats: true,
        documents: true,
        observationsAudioUrl: true,
        observationsAudioDuration: true,
        observationsAudioTranscript: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            dateNaissance: true,
            sexe: true,
          },
        },
        rdv: {
          select: {
            id: true,
            date: true,
            heureDebut: true,
            heureFin: true,
            modalite: true,
          },
        },
      },
    });

    return updatedDossier;
  }

  /**
   * Supprime l'enregistrement audio des observations
   */
  async deleteAudioRecording(
    patientId: number,
    rdvId: number
  ): Promise<DossierResponse> {
    // Vérifier que le dossier existe
    const existingDossier = await prisma.dossier.findUnique({
      where: {
        patientId_rdvId: {
          patientId,
          rdvId,
        },
      },
    });

    if (!existingDossier) {
      throw new ApiError(
        'Dossier médical non trouvé pour ce rendez-vous',
        'NOT_FOUND',
        404
      );
    }

    // Supprimer l'enregistrement audio
    const updatedDossier = await prisma.dossier.update({
      where: {
        id: existingDossier.id,
      },
      data: {
        observationsAudioUrl: null,
        observationsAudioDuration: null,
        observationsAudioTranscript: null,
      },
      select: {
        id: true,
        observations: true,
        resultats: true,
        documents: true,
        observationsAudioUrl: true,
        observationsAudioDuration: true,
        observationsAudioTranscript: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            dateNaissance: true,
            sexe: true,
          },
        },
        rdv: {
          select: {
            id: true,
            date: true,
            heureDebut: true,
            heureFin: true,
            modalite: true,
          },
        },
      },
    });

    return updatedDossier;
  }

  /**
   * Récupère tous les enregistrements audio multiples d'un dossier
   */
  async getMultipleAudioRecordings(
    patientId: number,
    rdvId: number
  ): Promise<AudioRecordingResponse[]> {
    // Vérifier que le dossier existe
    const dossier = await prisma.dossier.findUnique({
      where: {
        patientId_rdvId: {
          patientId,
          rdvId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!dossier) {
      throw new ApiError(
        'Dossier médical non trouvé pour ce rendez-vous',
        'NOT_FOUND',
        404
      );
    }

    // Récupérer tous les enregistrements audio
    const recordings = await prisma.audioRecording.findMany({
      where: {
        dossierId: dossier.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return recordings;
  }

  /**
   * Crée un nouvel enregistrement audio multiple pour un dossier
   */
  async createMultipleAudioRecording(
    patientId: number,
    rdvId: number,
    name: string,
    audioUrl: string,
    duration: number,
    mimeType: string,
    transcript?: string
  ): Promise<AudioRecordingResponse> {
    // Vérifier que le dossier existe
    const dossier = await prisma.dossier.findUnique({
      where: {
        patientId_rdvId: {
          patientId,
          rdvId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!dossier) {
      throw new ApiError(
        'Dossier médical non trouvé pour ce rendez-vous',
        'NOT_FOUND',
        404
      );
    }

    // Créer l'enregistrement audio
    const recording = await prisma.audioRecording.create({
      data: {
        dossierId: dossier.id,
        name,
        url: audioUrl,
        duration,
        mimeType,
        transcript: transcript || null,
      },
    });

    return recording;
  }

  /**
   * Met à jour le nom d'un enregistrement audio multiple
   */
  async updateMultipleAudioRecordingName(
    patientId: number,
    rdvId: number,
    recordingId: number,
    name: string
  ): Promise<AudioRecordingResponse> {
    // Vérifier que le dossier existe
    const dossier = await prisma.dossier.findUnique({
      where: {
        patientId_rdvId: {
          patientId,
          rdvId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!dossier) {
      throw new ApiError(
        'Dossier médical non trouvé pour ce rendez-vous',
        'NOT_FOUND',
        404
      );
    }

    // Vérifier que l'enregistrement appartient au dossier
    const recording = await prisma.audioRecording.findFirst({
      where: {
        id: recordingId,
        dossierId: dossier.id,
      },
    });

    if (!recording) {
      throw new ApiError(
        'Enregistrement audio non trouvé',
        'NOT_FOUND',
        404
      );
    }

    // Mettre à jour le nom
    const updatedRecording = await prisma.audioRecording.update({
      where: {
        id: recordingId,
      },
      data: {
        name,
      },
    });

    return updatedRecording;
  }

  /**
   * Supprime un enregistrement audio multiple
   */
  async deleteMultipleAudioRecording(
    patientId: number,
    rdvId: number,
    recordingId: number
  ): Promise<void> {
    // Vérifier que le dossier existe
    const dossier = await prisma.dossier.findUnique({
      where: {
        patientId_rdvId: {
          patientId,
          rdvId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!dossier) {
      throw new ApiError(
        'Dossier médical non trouvé pour ce rendez-vous',
        'NOT_FOUND',
        404
      );
    }

    // Vérifier que l'enregistrement appartient au dossier
    const recording = await prisma.audioRecording.findFirst({
      where: {
        id: recordingId,
        dossierId: dossier.id,
      },
    });

    if (!recording) {
      throw new ApiError(
        'Enregistrement audio non trouvé',
        'NOT_FOUND',
        404
      );
    }

    // Supprimer l'enregistrement (le fichier sera supprimé par le route handler)
    await prisma.audioRecording.delete({
      where: {
        id: recordingId,
      },
    });
  }
}

export const patientService = new PatientService();

