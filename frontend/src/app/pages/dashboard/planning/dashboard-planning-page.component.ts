import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiCardComponent, CardPoint } from '../../../shared/ui/card/ui-card.component';

/**
 * Page Planning Dashboard
 */
@Component({
  selector: 'app-dashboard-planning-page',
  standalone: true,
  imports: [CommonModule, UiCardComponent],
  templateUrl: './dashboard-planning-page.component.html',
  styleUrl: './dashboard-planning-page.component.scss',
})
export class DashboardPlanningPageComponent {
  cards: Array<{ icon?: string; title?: string; description?: string; points?: CardPoint[] }> = [
    {
      icon: 'calendar',
      title: 'Aujourd\'hui',
      description: 'Un aperçu rapide de votre journée : vacations, sites et modalités programmées.',
      points: [
        { icon: 'check', text: 'Vacations du jour en un coup d\'œil' },
        { icon: 'check', text: 'Sites et modalités associées' },
        { icon: 'check', text: 'Accès direct aux détails' }
      ]
    },
    {
      icon: 'folder',
      title: 'Dossiers à traiter',
      description: 'Retrouvez les dossiers patients liés à vos vacations pour vérification et annotation.',
      points: [
        { icon: 'check', text: 'Dossiers triés par priorité' },
        { icon: 'check', text: 'Accès aux examens et historiques' },
        { icon: 'check', text: 'Création d\'annotations rapide' }
      ]
    },
    {
      icon: 'message-circle',
      title: 'Messages',
      description: 'Échangez avec vos collègues sans quitter le portail pour aller plus vite au quotidien.',
      points: [
        { icon: 'check', text: 'Conversations par équipe' },
        { icon: 'check', text: 'Messages courts et efficaces' },
        { icon: 'check', text: 'Centralisation des échanges' }
      ]
    },
    {
      icon: 'bell',
      title: 'Notifications',
      description: 'Restez informé des changements et rappels importants liés à votre activité.',
      points: [
        { icon: 'check', text: 'Alertes de planning' },
        { icon: 'check', text: 'Rappels et actions attendues' },
        { icon: 'check', text: 'Suivi des nouveautés' }
      ]
    }
  ];
}

