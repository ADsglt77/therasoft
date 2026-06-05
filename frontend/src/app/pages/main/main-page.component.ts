import { Component } from '@angular/core';
import { MenuMainComponent } from '../../components/navbar/menuMain/menu-main.component';
import { AppIconComponent } from '../../components/icon/app-icon.component';
import { UiCardComponent, CardPoint } from '../../components/card/ui-card.component';

/**
 * Page principale (placeholder)
 */
@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [MenuMainComponent, AppIconComponent, UiCardComponent],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss',
})
export class MainPageComponent {
  cards: Array<{ icon?: string; title?: string; description?: string; points?: CardPoint[] }> = [
    {
      icon: 'calendar',
      title: 'Planning',
      description: 'Organisez vos vacations sur tous vos sites avec une vue d\'ensemble actualisée.',
      points: [
        { icon: 'check', text: 'Planning centralisé multi-sites' },
        { icon: 'check', text: 'Modalités et équipes assignées' },
        { icon: 'check', text: 'Synchronisation temps réel' }
      ]
    },
    {
      icon: 'folder',
      title: 'Dossiers patients',
      description: 'Accédez aux dossiers liés à vos vacations pour vérifier, annoter et valider vos examens.',
      points: [
        { icon: 'check', text: 'Liste des dossiers par vacation' },
        { icon: 'check', text: 'Examens, ordonnances et historique' },
        { icon: 'check', text: 'Annotations et suivi de validation' }
      ]
    },
    {
      icon: 'message-circle',
      title: 'Communication',
      description: 'Collaborez simplement avec vos équipes grâce au chat et aux notifications intégrées.',
      points: [
        { icon: 'check', text: 'Chat interne entre collègues' },
        { icon: 'check', text: 'Notifications et rappels' },
        { icon: 'check', text: 'Suivi des actions importantes' }
      ]
    }
  ];

}

