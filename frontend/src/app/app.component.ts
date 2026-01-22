import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationComponent } from './components/notification/notification.component';
import { ThemeService } from './shared/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationComponent],
  template: `
    <router-outlet></router-outlet>
    <app-notification></app-notification>
  `,
})
export class AppComponent implements OnInit {
  title = 'Portail Médecin';

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    // Synchronise le service avec le thème déjà appliqué dans main.ts
    // et s'assure que le localStorage est à jour
    this.themeService.init();
  }
}




