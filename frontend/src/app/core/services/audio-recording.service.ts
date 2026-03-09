import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface AudioRecordingResult {
  audioBlob: Blob;
  audioUrl: string;
  duration: number; // en secondes
  mimeType: string;
}

/**
 * Service pour gérer l'enregistrement audio via MediaRecorder API
 * Format : MP3 (ou WebM si MP3 non supporté)
 */
@Injectable({
  providedIn: 'root',
})
export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private durationSubject = new Subject<number>();
  public duration$ = this.durationSubject.asObservable();
  private durationInterval: any;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private volumeSubject = new Subject<number>();
  public volume$ = this.volumeSubject.asObservable();
  private volumeInterval: any;

  /**
   * Vérifie si l'API MediaRecorder est supportée
   */
  isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  /**
   * Demande la permission et démarre l'enregistrement
   * @param maxDuration Durée maximale en secondes (défaut: 300 = 5 minutes)
   */
  async startRecording(maxDuration: number = 300): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('L\'enregistrement audio n\'est pas supporté par votre navigateur');
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      throw new Error('Un enregistrement est déjà en cours');
    }

    try {
      // Demander l'accès au microphone
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Déterminer le format MIME (MP3 si supporté, sinon WebM)
      const mimeType = this.getSupportedMimeType();
      
      // Créer le MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType || undefined,
      });

      this.audioChunks = [];
      this.startTime = Date.now();

      // Écouter les données audio
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Démarrer l'enregistrement
      this.mediaRecorder.start(1000); // Collecter les données toutes les secondes

      // Démarrer le timer de durée
      this.startDurationTimer(maxDuration);
    } catch (error: any) {
      this.cleanup();
      
      // Gérer les erreurs spécifiques
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Permission d\'accès au microphone refusée. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('Aucun microphone détecté. Veuillez connecter un microphone et réessayer.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Le microphone est déjà utilisé par une autre application. Veuillez fermer les autres applications et réessayer.');
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        throw new Error('Les paramètres du microphone ne sont pas supportés. Veuillez utiliser un autre microphone.');
      } else if (error.name === 'AbortError') {
        throw new Error('L\'accès au microphone a été interrompu. Veuillez réessayer.');
      } else if (error.name === 'SecurityError') {
        throw new Error('L\'accès au microphone est bloqué pour des raisons de sécurité. Veuillez utiliser HTTPS ou localhost.');
      }
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('L\'accès au microphone a été refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('Aucun microphone n\'a été trouvé. Veuillez connecter un microphone.');
      } else {
        throw new Error(`Erreur lors du démarrage de l'enregistrement: ${error.message}`);
      }
    }
  }

  /**
   * Arrête l'enregistrement et retourne le résultat
   */
  async stopRecording(): Promise<AudioRecordingResult> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      throw new Error('Aucun enregistrement en cours');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder non initialisé'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          if (!this.mediaRecorder) {
            reject(new Error('MediaRecorder non initialisé'));
            return;
          }

          const duration = Math.floor((Date.now() - this.startTime) / 1000);
          const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          const audioUrl = URL.createObjectURL(audioBlob);

          const result: AudioRecordingResult = {
            audioBlob,
            audioUrl,
            duration,
            mimeType,
          };

          this.cleanup();
          resolve(result);
        } catch (error: any) {
          this.cleanup();
          reject(new Error(`Erreur lors de l'arrêt de l'enregistrement: ${error.message}`));
        }
      };

      this.mediaRecorder.stop();
      this.stopDurationTimer();
    });
  }

  /**
   * Annule l'enregistrement en cours
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  /**
   * Vérifie si un enregistrement est en cours
   */
  isRecording(): boolean {
    return !!(this.mediaRecorder && this.mediaRecorder.state === 'recording');
  }

  /**
   * Démarre l'analyse du volume audio
   */
  private startVolumeAnalysis(): void {
    this.stopVolumeAnalysis();
    
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    const analyze = () => {
      if (!this.analyser || !this.isRecording()) {
        this.stopVolumeAnalysis();
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculer le volume moyen (0-100)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const volume = Math.min(100, (average / 255) * 100);
      
      this.volumeSubject.next(volume);
      
      this.volumeInterval = requestAnimationFrame(analyze);
    };

    analyze();
  }

  /**
   * Arrête l'analyse du volume
   */
  private stopVolumeAnalysis(): void {
    if (this.volumeInterval) {
      cancelAnimationFrame(this.volumeInterval);
      this.volumeInterval = null;
    }
  }

  /**
   * Nettoie les ressources
   */
  private cleanup(): void {
    this.stopDurationTimer();
    this.stopVolumeAnalysis();
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.audioChunks = [];
    this.startTime = 0;
  }

  /**
   * Détermine le format MIME supporté (MP3 prioritaire, sinon WebM)
   */
  private getSupportedMimeType(): string | null {
    const mimeTypes = [
      'audio/mpeg', // MP3
      'audio/webm;codecs=opus', // WebM avec Opus
      'audio/webm', // WebM générique
      'audio/ogg;codecs=opus', // OGG avec Opus
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    return null; // Le navigateur utilisera son format par défaut
  }

  /**
   * Démarre le timer de durée
   */
  private startDurationTimer(maxDuration: number): void {
    this.stopDurationTimer();
    
    this.durationInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      this.durationSubject.next(elapsed);

      // Arrêter automatiquement à la durée maximale
      if (elapsed >= maxDuration) {
        this.stopRecording().catch(() => {
          // Ignorer les erreurs lors de l'arrêt automatique
        });
      }
    }, 1000);
  }

  /**
   * Arrête le timer de durée
   */
  private stopDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Convertit un Blob audio en File pour l'upload
   */
  blobToFile(blob: Blob, fileName: string): File {
    return new File([blob], fileName, { type: blob.type });
  }
}

