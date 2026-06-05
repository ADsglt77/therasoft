import { Component, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuDashboardComponent } from '../../components/navbar/menuDashboard/menu-dashboard.component';

@Component({
  selector: 'app-dashboard-main-page',
  standalone: true,
  imports: [RouterOutlet, MenuDashboardComponent],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss',
})
export class DashboardMainPageComponent {
  @ViewChild('sidebarShell') sidebarShell?: ElementRef<HTMLElement>;

  sidebarExpanded = false;

  onSidebarEnter(): void {
    this.sidebarExpanded = true;
  }

  onSidebarLeave(): void {
    this.sidebarExpanded = false;
    this.blurSidebarFocus();
  }

  private blurSidebarFocus(): void {
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      this.sidebarShell?.nativeElement.contains(active)
    ) {
      active.blur();
    }
  }
}
