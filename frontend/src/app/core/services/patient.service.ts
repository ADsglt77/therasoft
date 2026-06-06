import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../api/api-client.service';
import { HttpClient } from '@angular/common/http';

export interface DossierFile {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string;
}

export interface DossierOperationStatus {
  operationReady: boolean;
  operationReadyAt: string | null;
}

export interface DossierFileUploadResponse extends DossierOperationStatus {
  files: DossierFile[];
}

export interface Dossier {
  id: number;
  observations: string | null;
  operationReady: boolean;
  operationReadyAt: string | null;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  files: DossierFile[];
  patient: {
    id: number;
    nom: string;
    prenom: string;
    dateNaissance: string | null;
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

@Injectable({
  providedIn: 'root',
})
export class PatientService extends ApiClientService {
  constructor(http: HttpClient) {
    super(http);
  }

  getDossier(patientId: number, rdvId: number): Observable<Dossier> {
    return this.http.get<Dossier>(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier`
    );
  }

  updateObservations(
    patientId: number,
    rdvId: number,
    observations: string
  ): Observable<Dossier> {
    const observationsValue = observations.trim() === '' ? null : observations.trim();
    return this.http.patch<Dossier>(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/observations`,
      { observations: observationsValue }
    );
  }

  setVerified(patientId: number, rdvId: number, verified: boolean): Observable<Dossier> {
    return this.http.patch<Dossier>(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/verified`,
      { verified }
    );
  }

  uploadDossierFiles(
    patientId: number,
    rdvId: number,
    files: File[]
  ): Observable<DossierFileUploadResponse> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return this.http.post<DossierFileUploadResponse>(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/files`,
      formData
    );
  }

  deleteDossierFile(
    patientId: number,
    rdvId: number,
    fileId: number
  ): Observable<DossierOperationStatus> {
    return this.http.delete<DossierOperationStatus>(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/files/${fileId}`
    );
  }

  downloadDossierFile(patientId: number, rdvId: number, fileId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/patients/${patientId}/rdv/${rdvId}/dossier/files/${fileId}/download`,
      { responseType: 'blob' }
    );
  }
}

