import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthComponent } from '../../../shared/ui/auth/auth.component';
import { AppIconComponent } from '../../../shared/ui/icon/app-icon.component';

/**
 * Page wrapper pour les routes /login et /register
 * Affiche le composant auth avec un overlay et centré comme un modal
 */
@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, AuthComponent, AppIconComponent],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss',
})
export class AuthPageComponent {
  constructor(private router: Router) {}

  close(): void {
    this.router.navigate(['/']);
  }
}

