import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, HostBinding, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UiButtonComponent } from '../../button/ui-button.component';
import { UiAvatarComponent } from '../../avatar/ui-avatar.component';
import { AppIconComponent } from '../../icon/app-icon.component';
import { MenuHamburgerComponent } from './menuHamburger/menu-hamburger.component';
import { NavbarLinksComponent } from '../navbar-links/navbar-links.component';
import { AuthService, AuthUser } from '../../../core/services/auth.service';
import { navLinksForRole, NavLink } from '../../../core/constants/nav-links';

@Component({
  selector: 'app-menu-main',
  standalone: true,
  imports: [
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
  private readonly destroyRef = inject(DestroyRef);
  isAuthenticated = false;
  currentUser: AuthUser | null = null;
  showHamburgerMenu = false;
  mobileMenuOpen = false;

  @HostBinding('class')
  get hostClasses(): string {
    return 'menu-main' + (this.mobileMenuOpen ? ' menu-main--mobile-open' : '');
  }

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkAuthentication();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
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
    this.authService
      .restoreSession()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.currentUser = user;
        this.isAuthenticated = user !== null;
        this.cdr.markForCheck();
      });
  }

  /** Liens de navigation selon le rôle (source unique partagée avec le dashboard). */
  get navLinks(): NavLink[] {
    return navLinksForRole(this.currentUser?.role);
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
    this.authService.logout().subscribe(() => this.checkAuthentication());
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
}
