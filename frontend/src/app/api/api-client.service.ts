import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

/**
 * Service de base pour les appels API
 * Base URL configurée via environment
 */
@Injectable({
  providedIn: 'root',
})
export class ApiClientService {
  protected readonly baseUrl = environment.apiBaseUrl;

  constructor(protected http: HttpClient) {}
}

