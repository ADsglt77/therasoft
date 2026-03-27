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

}

