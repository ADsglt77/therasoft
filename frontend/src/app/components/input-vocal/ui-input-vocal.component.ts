import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../icon/app-icon.component';

export type VocalState = 'idle' | 'recording' | 'processing' | 'ready' | 'playing' | 'error';

/**
 * Composant vocal pour enregistrer et écouter des observations médicales
 * États : idle, recording, processing, ready, playing, error
 */
@Component({
  selector: 'ui-input-vocal',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './ui-input-vocal.component.html',
  styleUrl: './ui-input-vocal.component.scss',
  changeDetection: ChangeDetectionStrategy.Default, // Changé pour permettre les mises à jour du volume en temps réel
})
export class UiInputVocalComponent implements OnDestroy {
  @Input() disabled: boolean = false;
  @Input() hasRecording: boolean = false; // Indique si un enregistrement existe déjà
  @Input() recordingDuration: number = 0; // Durée de l'enregistrement en secondes
  @Input() maxDuration: number = 300; // 5 minutes en secondes

  @Output() startRecording = new EventEmitter<void>();
  @Output() stopRecording = new EventEmitter<void>();
  @Output() cancelRecording = new EventEmitter<void>();
  @Output() playRecording = new EventEmitter<void>();
  @Output() pauseRecording = new EventEmitter<void>();
  @Output() deleteRecording = new EventEmitter<void>();

  state: VocalState = 'idle';
  currentDuration: number = 0; // Durée actuelle de l'enregistrement en cours
  currentVolume: number = 0; // Volume audio actuel (0-100) pour l'indicateur visuel
  currentPlaybackTime: number = 0; // Temps de lecture actuel en secondes
  private durationInterval: any;

  ngOnDestroy(): void {
    this.clearDurationInterval();
  }

  /**
   * Gère le clic sur le bouton principal (souris ou clavier)
   */
  handleMainButtonClick(): void {
    if (this.disabled || this.state === 'processing') return;

    if (this.state === 'recording') {
      // Ne devrait pas arriver car le bouton principal change pendant l'enregistrement
      return;
    }

    if (this.hasRecording && (this.state === 'ready' || this.state === 'idle')) {
      // Si un enregistrement existe, jouer/pause
      this.onPlayRecording();
    } else if (this.state === 'idle') {
      // Sinon, démarrer l'enregistrement
      this.onStartRecording();
    }
  }

  /**
   * Démarre l'enregistrement
   */
  onStartRecording(): void {
    if (this.disabled || this.state === 'recording') return;
    
    this.state = 'recording';
    this.currentDuration = 0;
    this.startDurationTimer();
    this.startRecording.emit();
  }

  /**
   * Arrête l'enregistrement
   */
  onStopRecording(): void {
    if (this.state !== 'recording') return;
    
    this.state = 'processing';
    this.clearDurationInterval();
    this.stopRecording.emit();
  }

  /**
   * Annule l'enregistrement en cours
   */
  onCancelRecording(): void {
    if (this.state !== 'recording') return;
    
    this.state = 'idle';
    this.currentDuration = 0;
    this.clearDurationInterval();
    this.cancelRecording.emit();
  }

  /**
   * Joue l'enregistrement ou met en pause
   */
  onPlayRecording(): void {
    if (this.disabled || !this.hasRecording) return;
    
    if (this.state === 'playing') {
      this.state = 'ready';
      this.pauseRecording.emit();
    } else if (this.state === 'ready' || this.state === 'idle') {
      this.state = 'playing';
      this.playRecording.emit();
    }
  }

  /**
   * Supprime l'enregistrement
   */
  onDeleteRecording(): void {
    if (this.disabled || !this.hasRecording) return;
    
    this.state = 'idle';
    this.hasRecording = false;
    this.deleteRecording.emit();
  }

  /**
   * Met à jour l'état après traitement (appelé depuis le parent)
   */
  setState(state: VocalState): void {
    this.state = state;
    if (state === 'ready' || state === 'idle') {
      this.clearDurationInterval();
    }
  }

  /**
   * Démarre le timer de durée d'enregistrement
   */
  private startDurationTimer(): void {
    this.clearDurationInterval();
    this.durationInterval = setInterval(() => {
      this.currentDuration++;
      
      // Limite de 5 minutes atteinte
      if (this.currentDuration >= this.maxDuration) {
        this.onStopRecording();
      }
    }, 1000);
  }

  /**
   * Nettoie l'intervalle de durée
   */
  private clearDurationInterval(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Formate la durée en MM:SS
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Retourne l'icône à afficher selon l'état
   */
  getIconName(): string {
    switch (this.state) {
      case 'recording':
        return 'mic';
      case 'playing':
        return 'pause';
      case 'ready':
      case 'idle':
        if (this.hasRecording) {
          return 'play';
        }
        return 'mic';
      default:
        return 'mic';
    }
  }

  /**
   * Retourne le label du bouton selon l'état
   */
  getButtonLabel(): string {
    switch (this.state) {
      case 'recording':
        return 'Enregistrement...';
      case 'processing':
        return 'Traitement...';
      case 'playing':
        return 'Lecture en cours';
      case 'ready':
        return 'Écouter';
      case 'idle':
        if (this.hasRecording) {
          return 'Écouter';
        }
        return 'Enregistrer';
      default:
        return 'Enregistrer';
    }
  }
}

