import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NavbarLinksComponent } from '../../navbar-links/navbar-links.component';
import { NavLink } from '../../../../core/constants/nav-links';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-menu-hamburger',
  standalone: true,
  imports: [NavbarLinksComponent],
  templateUrl: './menu-hamburger.component.html',
  styleUrl: './menu-hamburger.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuHamburgerComponent {
  @Input() links: NavLink[] = [];
  @Output() logout = new EventEmitter<void>();
  private isLoggingOut = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  onLogout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;

    this.authService.logout().subscribe(() => {
      this.notificationService.show('information', 'Déconnexion réussie');
      this.logout.emit();
      this.isLoggingOut = false;
    });
  }
}

