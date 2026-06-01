import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UiButtonComponent } from '../../button/ui-button.component';
import { UiAvatarComponent } from '../../avatar/ui-avatar.component';
import { AppIconComponent } from '../../icon/app-icon.component';
import { MenuHamburgerComponent } from './menuHamburger/menu-hamburger.component';
import { AuthService, MeResponse } from '../../../core/services/auth.service';
import { ThemeService } from '../../../shared/theme/theme.service';

@Component({
  selector: 'app-menu-main',
  standalone: true,
  imports: [CommonModule, UiButtonComponent, UiAvatarComponent, AppIconComponent, MenuHamburgerComponent],
  templateUrl: './menu-main.component.html',
  styleUrl: './menu-main.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuMainComponent implements OnInit {
  isAuthenticated = false;
  currentUser: MeResponse | null = null;
  showHamburgerMenu = false;

  @HostBinding('class')
  get hostClasses(): string {
    return 'menu-main';
  }

  currentTheme: 'dark' | 'light' = 'dark';

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.checkAuthentication();
    
    // Initialiser le thème actuel
    this.currentTheme = this.themeService.getTheme();
    
    // Écouter les changements de route pour mettre à jour l'état d'authentification
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkAuthentication();
      });
  }

  checkAuthentication(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    
    if (this.isAuthenticated) {
      this.authService.getMe().subscribe({
        next: (user) => {
          this.currentUser = user;
          this.cdr.markForCheck();
        },
        error: () => {
          // Si erreur, l'utilisateur n'est probablement plus authentifié
          this.isAuthenticated = false;
          this.currentUser = null;
          this.cdr.markForCheck();
        },
      });
    } else {
      this.currentUser = null;
      this.cdr.markForCheck();
    }
  }

  getInitial(): string {
    if (this.currentUser?.prenom) {
      return this.currentUser.prenom.charAt(0).toUpperCase();
    }
    return '?';
  }

  onLoginClick(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Méthode publique pour rafraîchir l'état d'authentification
   * Peut être appelée après une connexion réussie
   */
  refreshAuthState(): void {
    this.checkAuthentication();
  }

  onAvatarMouseEnter(): void {
    this.showHamburgerMenu = true;
    this.cdr.markForCheck();
  }

  onAvatarMouseLeave(): void {
    this.showHamburgerMenu = false;
    this.cdr.markForCheck();
  }

  onAvatarToggle(): void {
    this.showHamburgerMenu = !this.showHamburgerMenu;
    this.cdr.markForCheck();
  }

  onLogout(): void {
    // Rafraîchir l'état d'authentification immédiatement après le logout
    this.checkAuthentication();
    // Fermer le menu hamburger
    this.showHamburgerMenu = false;
  }

  onToggleTheme(): void {
    this.themeService.toggle();
    this.currentTheme = this.themeService.getTheme();
    this.cdr.markForCheck();
  }
}

