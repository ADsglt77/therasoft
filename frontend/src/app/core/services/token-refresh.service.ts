import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { switchMap, finalize, catchError, shareReplay } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Service pour gérer le refresh du token de manière centralisée
 * Évite les refresh multiples simultanés
 */
@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  private refreshInProgress$: BehaviorSubject<Observable<string> | null> = new BehaviorSubject<Observable<string> | null>(null);

  constructor(private authService: AuthService) {}

  /**
   * Rafraîchit le token si nécessaire
   * Si un refresh est déjà en cours, attend qu'il se termine
   * @returns Observable qui émet le nouveau token ou une erreur
   */
  refreshToken(): Observable<string> {
    const currentRefresh = this.refreshInProgress$.value;

    // Si un refresh est déjà en cours, on attend qu'il se termine
    if (currentRefresh) {
      return currentRefresh;
    }

    // Sinon, on lance un nouveau refresh
    const refreshObservable = this.authService.refresh().pipe(
      switchMap((response) => {
        // Succès : on émet le nouveau token
        return of(response.accessToken);
      }),
      finalize(() => {
        // Une fois terminé (succès ou erreur), on réinitialise
        this.refreshInProgress$.next(null);
      }),
      catchError((error) => {
        // En cas d'erreur, on propage l'erreur (finalize s'occupera de réinitialiser)
        return throwError(() => error);
      }),
      shareReplay(1) // Partager le résultat entre tous les abonnés
    );

    // Enregistrer le refresh en cours
    this.refreshInProgress$.next(refreshObservable);

    return refreshObservable;
  }
}

