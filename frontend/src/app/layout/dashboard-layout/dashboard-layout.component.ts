import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MenuDashboardComponent } from '../../components/navbar/menuDashboard/menu-dashboard.component';

/**
 * Layout pour les pages du dashboard
 */
@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MenuDashboardComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
})
export class DashboardLayoutComponent {}
