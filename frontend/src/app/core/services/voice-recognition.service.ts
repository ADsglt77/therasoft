import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// Typage minimal de la Web Speech API (absente des types standard de TypeScript).
interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult extends ArrayLike<SpeechAlternative> {
  isFinal: boolean;
}
interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
}
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognition;

/** Messages lisibles pour les codes d'erreur de la Web Speech API. */
const ERROR_MESSAGES: Record<string, string> = {
  'no-speech': 'Aucune parole détectée',
  'audio-capture': "Impossible d'accéder au microphone",
  'not-allowed': 'Permission microphone refusée',
  network: 'Erreur réseau lors de la transcription',
};

/**
 * Transcription vocale via la Web Speech API (texte uniquement, aucun enregistrement audio).
 * Optionnelle : `isSupported()` indique si le navigateur la propose.
 */
@Injectable({ providedIn: 'root' })
export class VoiceRecognitionService {
  private readonly transcriptSubject = new Subject<string>();
  private readonly errorSubject = new Subject<Error>();

  /** Émet le texte transcrit (finalisé + intermédiaire) à chaque mise à jour. */
  readonly transcript$: Observable<string> = this.transcriptSubject.asObservable();
  /** Émet une erreur lisible (micro refusé, réseau, etc.). */
  readonly error$: Observable<Error> = this.errorSubject.asObservable();

  private isRecognizing = false;
  private finalTranscript = '';
  private readonly recognition: SpeechRecognition | null = this.createRecognition();

  /** Indique si la transcription vocale est disponible dans ce navigateur. */
  isSupported(): boolean {
    return this.recognition !== null;
  }

  startTranscription(): void {
    if (!this.recognition || this.isRecognizing) {
      return;
    }
    try {
      this.finalTranscript = '';
      this.isRecognizing = true;
      this.recognition.start();
    } catch (error) {
      this.isRecognizing = false;
      console.error('Démarrage de la transcription impossible :', error);
    }
  }

  stopTranscription(): void {
    if (!this.recognition || !this.isRecognizing) {
      return;
    }
    this.isRecognizing = false;
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Arrêt de la transcription impossible :', error);
    }
  }

  /** Texte finalisé (sans les résultats intermédiaires). */
  getFinalTranscript(): string {
    return this.finalTranscript.trim();
  }

  private createRecognition(): SpeechRecognition | null {
    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Implementation = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Implementation) {
      return null;
    }

    const recognition = new Implementation();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          this.finalTranscript += `${result[0].transcript} `;
        } else {
          interim += result[0].transcript;
        }
      }
      this.transcriptSubject.next(`${this.finalTranscript}${interim}`.trim());
    };

    recognition.onerror = (event) => {
      this.isRecognizing = false;
      this.errorSubject.next(new Error(ERROR_MESSAGES[event.error] ?? 'Erreur de transcription vocale'));
    };

    recognition.onend = () => {
      this.isRecognizing = false;
    };

    return recognition;
  }
}
