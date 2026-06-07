import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, finalize, shareReplay } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Centralise le refresh du token : si un refresh est déjà en cours,
 * les appels suivants attendent le même Observable (évite les refresh simultanés).
 */
@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  private readonly refreshInProgress$ = new BehaviorSubject<Observable<string> | null>(null);

  constructor(private authService: AuthService) {}

  /**
   * Rafraîchit le token, ou renvoie le refresh déjà en cours le cas échéant.
   * @returns Observable émettant le nouveau token (ou propageant l'erreur).
   */
  refreshToken(): Observable<string> {
    const currentRefresh = this.refreshInProgress$.value;
    if (currentRefresh) {
      return currentRefresh;
    }

    const refresh$ = this.authService.refresh().pipe(
      map((response) => response.role),
      finalize(() => this.refreshInProgress$.next(null)),
      shareReplay(1)
    );

    this.refreshInProgress$.next(refresh$);
    return refresh$;
  }
}
