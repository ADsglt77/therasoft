import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { UiBadgeComponent } from '../../../components/badge/ui-badge.component';

/**
 * Page Planning Day Dashboard
 * Affiche le planning pour un jour spécifique
 */
@Component({
  selector: 'app-dashboard-planning-day-page',
  standalone: true,
  imports: [CommonModule, AppIconComponent, UiButtonComponent, UiBadgeComponent],
  templateUrl: './dashboard-planning-day-page.component.html',
  styleUrl: './dashboard-planning-day-page.component.scss',
})
export class DashboardPlanningDayPageComponent {
  day: string | null = null;
  formattedDate: string = '';
  date: Date | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.paramMap.subscribe(params => {
      this.day = params.get('day');
      if (this.day) {
        this.parseDate(this.day);
      }
    });
  }

  parseDate(dateStr: string): void {
    // Format attendu: YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Les mois sont 0-indexés
      const day = parseInt(parts[2], 10);
      
      this.date = new Date(year, month, day);
      this.formattedDate = this.date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard/planning']);
  }

  get isToday(): boolean {
    if (!this.date) return false;
    const today = new Date();
    return this.date.toDateString() === today.toDateString();
  }

  get isWeekend(): boolean {
    if (!this.date) return false;
    const dayOfWeek = this.date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }
}

