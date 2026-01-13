import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuDashboardComponent } from '../../components/navbar/menuDashboard/menu-dashboard.component';

@Component({
  selector: 'app-dashboard-main-page',
  standalone: true,
  imports: [CommonModule, MenuDashboardComponent],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss',
})
export class DashboardMainPageComponent {}

