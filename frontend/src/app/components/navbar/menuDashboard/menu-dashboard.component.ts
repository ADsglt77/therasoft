import { ChangeDetectionStrategy, Component, HostBinding, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UiAvatarComponent } from '../../avatar/ui-avatar.component';
import { AppIconComponent } from '../../icon/app-icon.component';
import { NavbarLinksComponent } from '../navbar-links/navbar-links.component';
import { AuthService, MeResponse } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-menu-dashboard',
  standalone: true,
  imports: [RouterModule, UiAvatarComponent, AppIconComponent, NavbarLinksComponent],
  templateUrl: './menu-dashboard.component.html',
  styleUrl: './menu-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuDashboardComponent implements OnInit, OnDestroy {
  @Input() collapsed = true;

  @HostBinding('class.menu-dashboard')
  readonly hostClass = true;

  @HostBinding('class.collapsed')
  get isCollapsed(): boolean {
    return this.collapsed;
  }

  currentUser: MeResponse | null = null;
  private isLoggingOut = false;
  private userSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Charger les informations utilisateur initiales
    this.loadUserInfo();
    
    // S'abonner aux mises à jour de l'utilisateur en temps réel
    this.userSubscription = this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    // Nettoyer l'abonnement lors de la destruction du composant
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  loadUserInfo(): void {
    // Charger les informations utilisateur si elles ne sont pas déjà chargées
    this.authService.getMe().subscribe({
      next: () => {
        // L'utilisateur sera automatiquement mis à jour via le BehaviorSubject
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des informations utilisateur:', error);
        // En cas d'erreur, on laisse currentUser à null
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Obtient les initiales de l'utilisateur pour l'avatar
   */
  get userInitials(): string {
    if (!this.currentUser) {
      return '?';
    }
    const nomInitial = this.currentUser.nom?.charAt(0).toUpperCase() || '';
    const prenomInitial = this.currentUser.prenom?.charAt(0).toUpperCase() || '';
    return `${prenomInitial}${nomInitial}` || '?';
  }

  /** Le menu s'adapte au rôle : un patient ne voit que la prise de rendez-vous. */
  get isPatient(): boolean {
    return this.currentUser?.role === 'PATIENT';
  }

  onLogout(): void {
    // Éviter les appels multiples
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;

    this.authService.logout().subscribe({
      next: () => {
        this.notificationService.show('information', 'Déconnexion réussie');
        // La redirection est gérée dans AuthService
        this.isLoggingOut = false;
      },
      error: (err) => {
        console.error('Erreur lors de la déconnexion:', err);
        // En cas d'erreur, le token est déjà nettoyé et la redirection est gérée dans AuthService
        // On affiche quand même une notification de déconnexion réussie
        this.notificationService.show('information', 'Déconnexion réussie');
        this.isLoggingOut = false;
      },
    });
  }
}

