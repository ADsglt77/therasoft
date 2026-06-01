import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UiButtonComponent } from '../../button/ui-button.component';
import { UiAvatarComponent } from '../../avatar/ui-avatar.component';
import { AppIconComponent } from '../../icon/app-icon.component';
import { MenuHamburgerComponent } from './menuHamburger/menu-hamburger.component';
import { NavbarLinksComponent } from '../navbar-links/navbar-links.component';
import { AuthService, MeResponse } from '../../../core/services/auth.service';
import { ThemeService } from '../../../shared/theme/theme.service';

@Component({
  selector: 'app-menu-main',
  standalone: true,
  imports: [
    CommonModule,
    UiButtonComponent,
    UiAvatarComponent,
    AppIconComponent,
    MenuHamburgerComponent,
    NavbarLinksComponent,
  ],
  templateUrl: './menu-main.component.html',
  styleUrl: './menu-main.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuMainComponent implements OnInit {
  isAuthenticated = false;
  currentUser: MeResponse | null = null;
  showHamburgerMenu = false;
  mobileMenuOpen = false;

  @HostBinding('class')
  get hostClasses(): string {
    return 'menu-main' + (this.mobileMenuOpen ? ' menu-main--mobile-open' : '');
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
    this.currentTheme = this.themeService.getTheme();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkAuthentication();
        this.closeMobileMenu();
      });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
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
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }

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
    this.checkAuthentication();
    this.showHamburgerMenu = false;
  }

  onMobileLogout(): void {
    this.closeMobileMenu();
    this.authService.logout().subscribe({
      next: () => this.checkAuthentication(),
      error: () => this.checkAuthentication(),
    });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.cdr.markForCheck();
  }

  closeMobileMenu(): void {
    if (!this.mobileMenuOpen) {
      return;
    }
    this.mobileMenuOpen = false;
    this.cdr.markForCheck();
  }

  onToggleTheme(): void {
    this.themeService.toggle();
    this.currentTheme = this.themeService.getTheme();
    this.cdr.markForCheck();
  }
}
