import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

/**
 * Page Planning Day Dashboard
 * Affiche le planning pour un jour spécifique
 */
@Component({
  selector: 'app-dashboard-planning-day-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-planning-day-page.component.html',
  styleUrl: './dashboard-planning-day-page.component.scss',
})
export class DashboardPlanningDayPageComponent {
  day: string | null = null;

  constructor(private route: ActivatedRoute) {
    this.route.paramMap.subscribe(params => {
      this.day = params.get('day');
    });
  }
}

