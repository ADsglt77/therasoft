import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent, UiCardComponent, UiBadgeComponent, UiAvatarComponent, MenuHamburgerComponent, MenuMainComponent, MenuDashboardComponent, UiInputComponent, CardPoint, NotificationVariant, SelectOption, DayCardComponent, NavCalendarComponent, TimetableComponent } from '../../components';
import { NotificationService } from '../../core/services/notification.service';
import { PlanningService, Rdv } from '../../core/services/planning.service';
import { formatTime } from '../../core/utils/date.utils';

/**
 * Interface pour les slots du timetable
 */
interface TimetableSlot {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  disabled: boolean;
}

/**
 * Page UI Playground - Pour tester et visualiser les composants UI
 */
@Component({
  selector: 'app-playground-page',
  standalone: true,
  imports: [CommonModule, UiButtonComponent, UiCardComponent, UiBadgeComponent, UiAvatarComponent, MenuHamburgerComponent, MenuMainComponent, MenuDashboardComponent, UiInputComponent, DayCardComponent, NavCalendarComponent, TimetableComponent],
  templateUrl: './playground-page.component.html',
  styleUrl: './playground-page.component.scss',
})

export class PlaygroundPageComponent implements OnInit {
  // Calendar demo data
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  monthName = new Date().toLocaleDateString('fr-FR', { month: 'long' });
  dayNumber = new Date().getDate();
  yearOptions: SelectOption[] = [];

  // Timetable data from API
  timetableSlots: TimetableSlot[] = [];
  isLoadingRdvs = false;

  constructor(
    private notificationService: NotificationService,
    private planningService: PlanningService
  ) {
    // Générer les options d'années
    for (let i = this.currentYear - 5; i <= this.currentYear + 5; i++) {
      this.yearOptions.push({ value: i.toString(), label: i.toString() });
    }
  }

  ngOnInit(): void {
    this.loadRdvs();
  }

  loadRdvs(): void {
    this.isLoadingRdvs = true;
    this.planningService.getRdvsForMonth(this.currentYear, this.currentMonth).subscribe({
      next: (response) => {
        // Limiter à 3 exemples pour le playground
        const rdvsToShow = response.rdvs.slice(0, 3);
        
        this.timetableSlots = rdvsToShow.map((rdv: Rdv) => {
          // Les heures viennent comme strings ISO depuis l'API
          // Exemple: "2000-01-01T08:30:00.000Z" ou "08:30:00"
          const startTime = formatTime(rdv.heureDebut);
          const endTime = formatTime(rdv.heureFin);
          
          return {
            id: rdv.id.toString(),
            startTime,
            endTime,
            title: `${rdv.modalite} - ${rdv.patient.prenom} ${rdv.patient.nom}`,
            disabled: false,
          };
        });
        this.isLoadingRdvs = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des rendez-vous:', error);
        this.notificationService.show('danger', 'Erreur lors du chargement des rendez-vous');
        this.isLoadingRdvs = false;
      },
    });
  }

  showNotification(variant: NotificationVariant): void {
    this.notificationService.show(variant, `Here the message you want to show - ${variant}`);
  }
  
  points1: CardPoint[] = [
    { icon: 'sparkles', text: 'Point 1' },
    { icon: 'check', text: 'Point 2' },
    { icon: 'star', text: 'Point 3' }
  ];

  points2: CardPoint[] = [
    { icon: 'circle', text: 'Point 2' },
    { icon: 'check', text: 'Point 3' }
  ];

  points3: CardPoint[] = [
    { icon: 'circle', text: 'Point 1' },
    { icon: 'star', text: 'Point 2' },
    { icon: 'heart', text: 'Point 3' }
  ];

  // Options pour le select
  selectOptions: SelectOption[] = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
    { value: 'option4', label: 'Option 4' },
  ];

  selectedValue: string = 'option2';

  onSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedValue = select.value;
    console.log('Selected value:', this.selectedValue);
  }

  onPreviousMonth(): void {
    console.log('Previous month');
  }

  onNextMonth(): void {
    console.log('Next month');
  }

  onYearChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    console.log('Year changed:', select.value);
  }

  onPreviousDay(): void {
    console.log('Previous day');
  }

  onNextDay(): void {
    console.log('Next day');
  }

  onGoBack(): void {
    console.log('Go back');
  }

  onDayClick(event: { year: number; month: number; day: number }): void {
    console.log('Day clicked:', event);
  }

  onFilesSelected(files: File[]): void {
    console.log('Files selected:', files);
    this.notificationService.show('success', `${files.length} fichier(s) sélectionné(s) avec succès`);
  }

  onFileError(error: { file: File; error: string }): void {
    console.error('File error:', error);
    this.notificationService.show('danger', `Erreur: ${error.error} - ${error.file.name}`);
  }

  onTimetableActionClick(slotId: string): void {
    console.log('Timetable action clicked for slot:', slotId);
    const slot = this.timetableSlots.find((s) => s.id === slotId);
    if (slot) {
      this.notificationService.show('information', `Voir le dossier pour: ${slot.title}`);
    }
  }
}

