import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Service pour gérer l'ouverture/fermeture du modal d'authentification
 * Permet aux guards et interceptors d'ouvrir le modal depuis n'importe où
 */
@Injectable({
  providedIn: 'root',
})
export class AuthModalService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  isOpen$: Observable<boolean> = this.isOpenSubject.asObservable();

  /**
   * Ouvre le modal d'authentification
   */
  open(): void {
    this.isOpenSubject.next(true);
  }

  /**
   * Ferme le modal d'authentification
   */
  close(): void {
    this.isOpenSubject.next(false);
  }

  /**
   * Récupère l'état actuel du modal
   */
  getIsOpen(): boolean {
    return this.isOpenSubject.value;
  }
}

