import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}

/**
 * Service pour gérer la transcription vocale via Web Speech API
 * Transcription optionnelle (peut être désactivée)
 */
@Injectable({
  providedIn: 'root',
})
export class VoiceRecognitionService {
  private recognition: any = null;
  private transcriptSubject = new Subject<TranscriptionResult>();
  public transcript$ = this.transcriptSubject.asObservable();
  private errorSubject = new Subject<Error>();
  public error$ = this.errorSubject.asObservable();
  private isRecognizing = false;
  private finalTranscript = '';

  constructor() {
    this.initializeRecognition();
  }

  /**
   * Initialise l'API de reconnaissance vocale
   */
  private initializeRecognition(): void {
    // Vérifier le support du navigateur
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Web Speech API non supportée par ce navigateur');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true; // Transcription continue
      this.recognition.interimResults = true; // Résultats intermédiaires
      this.recognition.lang = 'fr-FR'; // Langue française

      // Événement : résultats de transcription
      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const isFinal = event.results[i].isFinal;
          const confidence = event.results[i][0].confidence;

          if (isFinal) {
            this.finalTranscript += transcript + ' ';
            this.transcriptSubject.next({
              transcript: this.finalTranscript.trim(),
              isFinal: true,
              confidence,
            });
          } else {
            interimTranscript += transcript;
            this.transcriptSubject.next({
              transcript: this.finalTranscript.trim() + ' ' + interimTranscript,
              isFinal: false,
              confidence,
            });
          }
        }
      };

      // Événement : erreur
      this.recognition.onerror = (event: any) => {
        console.error('Erreur de reconnaissance vocale:', event.error);
        
        let errorMessage = 'Erreur de transcription vocale';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'Aucune parole détectée';
            break;
          case 'audio-capture':
            errorMessage = 'Impossible d\'accéder au microphone';
            break;
          case 'not-allowed':
            errorMessage = 'Permission microphone refusée';
            break;
          case 'network':
            errorMessage = 'Erreur réseau lors de la transcription';
            break;
        }

        this.isRecognizing = false;
        this.errorSubject.next(new Error(errorMessage));
      };

      // Événement : fin de reconnaissance
      this.recognition.onend = () => {
        this.isRecognizing = false;
      };
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la reconnaissance vocale:', error);
    }
  }

  /**
   * Vérifie si l'API de reconnaissance vocale est supportée
   */
  isSupported(): boolean {
    return !!(this.recognition || 
             (window as any).SpeechRecognition || 
             (window as any).webkitSpeechRecognition);
  }

  /**
   * Démarre la transcription vocale
   */
  startTranscription(): void {
    if (!this.isSupported()) {
      console.warn('Reconnaissance vocale non supportée');
      return;
    }

    if (!this.recognition) {
      console.warn('Reconnaissance vocale non initialisée');
      return;
    }

    if (this.isRecognizing) {
      console.warn('Une transcription est déjà en cours');
      return;
    }

    try {
      this.finalTranscript = '';
      this.isRecognizing = true;
      this.recognition.start();
    } catch (error: any) {
      console.error('Erreur lors du démarrage de la transcription:', error);
      this.isRecognizing = false;
    }
  }

  /**
   * Arrête la transcription vocale
   */
  stopTranscription(): void {
    if (!this.recognition || !this.isRecognizing) {
      return;
    }

    try {
      this.recognition.stop();
      this.isRecognizing = false;
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de la transcription:', error);
    }
  }

  /**
   * Annule la transcription en cours
   */
  cancelTranscription(): void {
    if (!this.recognition || !this.isRecognizing) {
      return;
    }

    try {
      this.recognition.abort();
      this.finalTranscript = '';
      this.isRecognizing = false;
    } catch (error) {
      console.error('Erreur lors de l\'annulation de la transcription:', error);
    }
  }

  /**
   * Vérifie si une transcription est en cours
   */
  isTranscribing(): boolean {
    return this.isRecognizing;
  }

  /**
   * Retourne la transcription finale actuelle
   */
  getFinalTranscript(): string {
    return this.finalTranscript.trim();
  }

  /**
   * Réinitialise la transcription
   */
  reset(): void {
    this.finalTranscript = '';
    this.isRecognizing = false;
  }
}



