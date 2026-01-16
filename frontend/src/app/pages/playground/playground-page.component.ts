import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent, UiCardComponent, UiBadgeComponent, UiAvatarComponent, MenuHamburgerComponent, MenuMainComponent, MenuDashboardComponent, UiInputComponent, CardPoint, NotificationVariant, SelectOption, DayCardComponent, NavCalendarMonthComponent, NavCalendarDayComponent } from '../../components';
import { NotificationService } from '../../core/services/notification.service';

/**
 * Page UI Playground - Pour tester et visualiser les composants UI
 */
@Component({
  selector: 'app-playground-page',
  standalone: true,
  imports: [CommonModule, UiButtonComponent, UiCardComponent, UiBadgeComponent, UiAvatarComponent, MenuHamburgerComponent, MenuMainComponent, MenuDashboardComponent, UiInputComponent, DayCardComponent, NavCalendarMonthComponent, NavCalendarDayComponent],
  templateUrl: './playground-page.component.html',
  styleUrl: './playground-page.component.scss',
})

export class PlaygroundPageComponent {
  // Calendar demo data
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  monthName = new Date().toLocaleDateString('fr-FR', { month: 'long' });
  yearOptions: SelectOption[] = [];

  constructor(private notificationService: NotificationService) {
    // Générer les options d'années
    for (let i = this.currentYear - 5; i <= this.currentYear + 5; i++) {
      this.yearOptions.push({ value: i.toString(), label: i.toString() });
    }
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
}

