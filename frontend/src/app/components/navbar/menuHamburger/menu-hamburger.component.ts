import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarLinksComponent } from '../navbar-links/navbar-links.component';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-menu-hamburger',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarLinksComponent],
  templateUrl: './menu-hamburger.component.html',
  styleUrl: './menu-hamburger.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuHamburgerComponent {
  @Output() logout = new EventEmitter<void>();
  private isLoggingOut = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  onLogout(): void {
    // Éviter les appels multiples
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;

    this.authService.logout().subscribe({
      next: () => {
        this.notificationService.show('information', 'Déconnexion réussie');
        // Émettre l'événement de logout pour notifier le parent
        this.logout.emit();
        this.isLoggingOut = false;
      },
      error: (err) => {
        console.error('Erreur lors de la déconnexion:', err);
        // En cas d'erreur, le token est déjà nettoyé et la redirection est gérée dans AuthService
        // On affiche quand même une notification de déconnexion réussie
        this.notificationService.show('information', 'Déconnexion réussie');
        this.logout.emit();
        this.isLoggingOut = false;
      },
    });
  }
}

