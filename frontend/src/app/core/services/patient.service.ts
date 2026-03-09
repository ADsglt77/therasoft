import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../api/api-client.service';
import { HttpClient } from '@angular/common/http';

/**
 * Interface pour le dossier médical retourné par l'API
 */
export interface Dossier {
  id: number;
  observations: string | null;
  resultats: string | null;
  documents: string | null;
  observationsAudioUrl: string | null;
  observationsAudioDuration: number | null;
  observationsAudioTranscript: string | null;
  audioRecordings?: AudioRecording[]; // Nouveaux enregistrements multiples
  createdAt: string;
  updatedAt: string;
  patient: {
    id: number;
    nom: string;
    prenom: string;
    dateNaissance: string;
    sexe: string | null;
  };
  rdv: {
    id: number;
    date: string;
    heureDebut: string;
    heureFin: string;
    modalite: string;
  };
}

/**
 * Interface pour un enregistrement audio multiple
 */
export interface AudioRecording {
  id: number;
  name: string;
  url: string;
  duration: number;
  transcript: string | null;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Service pour gérer les appels API liés aux patients et dossiers
 */
@Injectable({
  providedIn: 'root',
})
export class PatientService extends ApiClientService {
  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Récupère le dossier médical d'un patient pour un RDV spécifique
   */
  getDossier(patientId: number, rdvId: number): Observable<Dossier> {
    return this.http.get<Dossier>(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier`
    );
  }

  /**
   * Met à jour les observations médicales d'un dossier
   */
  updateObservations(
    patientId: number,
    rdvId: number,
    observations: string
  ): Observable<Dossier> {
    // Convertir chaîne vide en null pour permettre la suppression des observations
    // Le backend n'accepte que null ou une chaîne non vide
    const observationsValue = observations.trim() === '' ? null : observations.trim();
    return this.http.patch<Dossier>(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/observations`,
      { observations: observationsValue }
    );
  }

  /**
   * Upload un enregistrement audio pour les observations
   */
  uploadAudioRecording(
    patientId: number,
    rdvId: number,
    audioBlob: Blob,
    duration: number,
    transcript?: string
  ): Observable<Dossier> {
    return new Observable((observer) => {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        const mimeType = audioBlob.type || 'audio/webm';
        
        this.http
          .post<Dossier>(
            `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/observations/audio`,
            {
              audio: base64Audio,
              duration,
              transcript,
              mimeType,
            }
          )
          .subscribe({
            next: (dossier) => {
              observer.next(dossier);
              observer.complete();
            },
            error: (error) => {
              observer.error(error);
            },
          });
      };
      
      reader.onerror = () => {
        observer.error(new Error('Erreur lors de la lecture du fichier audio'));
      };
      
      reader.readAsDataURL(audioBlob);
    });
  }

  /**
   * Récupère le fichier audio des observations
   */
  getAudioRecording(patientId: number, rdvId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/observations/audio`,
      { responseType: 'blob' }
    );
  }

  /**
   * Supprime l'enregistrement audio des observations
   */
  deleteAudioRecording(patientId: number, rdvId: number): Observable<Dossier> {
    return this.http.delete<Dossier>(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/observations/audio`
    );
  }

  // ========== Enregistrements audio multiples ==========

  /**
   * Récupère tous les enregistrements audio d'un dossier
   */
  getAudioRecordings(patientId: number, rdvId: number): Observable<AudioRecording[]> {
    return this.http.get<AudioRecording[]>(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/audio-recordings`
    );
  }

  /**
   * Crée un nouvel enregistrement audio avec nom
   */
  createAudioRecording(
    patientId: number,
    rdvId: number,
    data: { name: string; audio: string; mimeType: string; duration: number; transcript?: string }
  ): Observable<AudioRecording> {
    return this.http.post<AudioRecording>(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/audio-recordings`,
      data
    );
  }

  /**
   * Met à jour le nom d'un enregistrement audio
   */
  updateAudioRecordingName(
    patientId: number,
    rdvId: number,
    recordingId: number,
    name: string
  ): Observable<AudioRecording> {
    return this.http.patch<AudioRecording>(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/audio-recordings/${recordingId}`,
      { name }
    );
  }

  /**
   * Récupère un fichier audio spécifique
   */
  getAudioRecordingFile(patientId: number, rdvId: number, recordingId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/audio-recordings/${recordingId}`,
      { responseType: 'blob' }
    );
  }

  /**
   * Supprime un enregistrement audio spécifique
   */
  deleteAudioRecordingById(patientId: number, rdvId: number, recordingId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/audio-recordings/${recordingId}`
    );
  }
}

