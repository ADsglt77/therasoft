import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../icon/app-icon.component';
import { AudioRecording } from '../../core/services/patient.service';

/**
 * Composant pour afficher la liste des enregistrements audio avec leurs noms
 */
@Component({
  selector: 'ui-audio-recordings-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  templateUrl: './ui-audio-recordings-list.component.html',
  styleUrl: './ui-audio-recordings-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiAudioRecordingsListComponent implements OnInit, OnDestroy {
  @Input() recordings: AudioRecording[] = [];
  @Input() disabled: boolean = false;
  @Input() patientId!: number;
  @Input() rdvId!: number;
  @Input() currentlyPlayingId: number | null = null; // ID de l'enregistrement en cours de lecture (depuis le parent)

  @Output() playRecording = new EventEmitter<AudioRecording>();
  @Output() pauseRecording = new EventEmitter<AudioRecording>();
  @Output() deleteRecording = new EventEmitter<AudioRecording>();
  @Output() renameRecording = new EventEmitter<{ recording: AudioRecording; newName: string }>();
  editingNameId: number | null = null;
  editingName: string = '';

  ngOnInit(): void {
    // Initialiser si nécessaire
  }

  ngOnDestroy(): void {
    // Nettoyage si nécessaire
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
   * Formate la date de création
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Démarre l'édition du nom
   */
  startEditingName(recording: AudioRecording): void {
    if (this.disabled) return;
    this.editingNameId = recording.id;
    this.editingName = recording.name;
  }

  /**
   * Annule l'édition du nom
   */
  cancelEditingName(): void {
    this.editingNameId = null;
    this.editingName = '';
  }

  /**
   * Sauvegarde le nouveau nom
   */
  saveName(recording: AudioRecording): void {
    if (this.editingName.trim() === '' || this.editingName === recording.name) {
      this.cancelEditingName();
      return;
    }

    this.renameRecording.emit({
      recording,
      newName: this.editingName.trim(),
    });

    this.cancelEditingName();
  }

  /**
   * Gère le clic sur play/pause
   */
  onPlayPause(recording: AudioRecording): void {
    if (this.isPlaying(recording)) {
      this.pauseRecording.emit(recording);
    } else {
      this.playRecording.emit(recording);
    }
  }

  /**
   * Gère la suppression
   */
  onDelete(recording: AudioRecording): void {
    if (this.disabled) return;
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'enregistrement "${recording.name}" ?`)) {
      this.deleteRecording.emit(recording);
    }
  }

  /**
   * Vérifie si un enregistrement est en cours de lecture
   */
  isPlaying(recording: AudioRecording): boolean {
    return this.currentlyPlayingId !== null && this.currentlyPlayingId === recording.id;
  }
}

