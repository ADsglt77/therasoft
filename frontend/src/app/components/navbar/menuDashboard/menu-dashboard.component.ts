import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostBinding,
  Input,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { UiAvatarComponent } from '../../avatar/ui-avatar.component';
import { AppIconComponent } from '../../icon/app-icon.component';
import { NavbarLinksComponent } from '../navbar-links/navbar-links.component';
import { AuthService, AuthUser } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { navLinksForRole, NavLink } from '../../../core/constants/nav-links';

@Component({
  selector: 'app-menu-dashboard',
  standalone: true,
  imports: [RouterModule, UiAvatarComponent, AppIconComponent, NavbarLinksComponent],
  templateUrl: './menu-dashboard.component.html',
  styleUrl: './menu-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuDashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  @Input() collapsed = true;

  @HostBinding('class.menu-dashboard')
  readonly hostClass = true;

  @HostBinding('class.collapsed')
  get isCollapsed(): boolean {
    return this.collapsed;
  }

  currentUser: AuthUser | null = null;
  private isLoggingOut = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.currentUser = user;
        this.cdr.markForCheck();
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

  /** Liens de navigation selon le rôle (source unique partagée avec les autres navbars). */
  get navLinks(): NavLink[] {
    return navLinksForRole(this.currentUser?.role);
  }

  onLogout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;

    this.authService.logout().subscribe(() => {
      this.notificationService.show('information', 'Déconnexion réussie');
      this.isLoggingOut = false;
    });
  }
}

