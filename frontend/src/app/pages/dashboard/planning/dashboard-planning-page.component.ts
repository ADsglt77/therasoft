import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardPoint } from '../../../components/card/ui-card.component';
import { DayCardComponent, DayType } from '../../../components/calendar/month/day-card/day-card.component';
import { NavCalendarComponent } from '../../../components/calendar/nav-calendar/nav-calendar.component';
import { SelectOption } from '../../../components/input/ui-input.component';
import { PlanningService, Vacation } from '../../../core/services/planning.service';

interface DayData {
  dayNumber: number;
  type: DayType;
  location?: string;
  disabled?: boolean;
  isToday?: boolean;
  year: number;
  month: number;
}

// Constantes
const WEEKS_TO_DISPLAY = 5;
const DAYS_PER_WEEK = 7;
const TOTAL_DAYS_TO_DISPLAY = WEEKS_TO_DISPLAY * DAYS_PER_WEEK; // 35
const YEAR_RANGE = 5; // Années avant/après l'année actuelle

/**
 * Page Planning Dashboard
 */
@Component({
  selector: 'app-dashboard-planning-page',
  standalone: true,
  imports: [CommonModule, DayCardComponent, NavCalendarComponent],
  templateUrl: './dashboard-planning-page.component.html',
  styleUrl: './dashboard-planning-page.component.scss',
})
export class DashboardPlanningPageComponent implements OnInit {
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

  // Constantes publiques
  readonly weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

  // État du calendrier
  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();

  // Vacations chargées depuis l'API
  private vacations: Vacation[] = [];
  private vacationsByDate: Map<string, Vacation[]> = new Map();

  // Cache pour optimiser les performances
  private _today: Date | null = null;
  private _cachedMonthName: string | null = null;
  private _cachedMonth: number | null = null;
  private _cachedDays: DayData[] | null = null;
  private _cachedDaysKey: string | null = null;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private planningService: PlanningService
  ) {}

  ngOnInit(): void {
    this.loadVacations();
    this.cdr.markForCheck();
  }

  /**
   * Retourne le nom du mois en français (mis en cache)
   */
  get monthName(): string {
    if (this._cachedMonthName === null || this._cachedMonth !== this.currentMonth) {
      this._cachedMonthName = this.currentDate.toLocaleDateString('fr-FR', { month: 'long' });
      this._cachedMonth = this.currentMonth;
    }
    return this._cachedMonthName;
  }

  /**
   * Génère la liste des années disponibles (5 ans avant/après)
   */
  get yearOptions(): SelectOption[] {
    const years: SelectOption[] = [];
    for (let i = this.currentYear - YEAR_RANGE; i <= this.currentYear + YEAR_RANGE; i++) {
      years.push({
        value: i.toString(),
        label: i.toString()
      });
    }
    return years;
  }

  /**
   * Retourne le nombre de jours dans le mois actuel
   */
  private get daysInMonth(): number {
    return new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
  }

  /**
   * Retourne la date d'aujourd'hui (mise en cache)
   */
  private get today(): Date {
    if (!this._today) {
      this._today = new Date();
    }
    return this._today;
  }

  /**
   * Convertit le jour de la semaine JavaScript (0=dimanche, 1=lundi...) 
   * vers notre format (0=lundi, 1=mardi..., 6=dimanche)
   */
  private getDayOfWeekIndex(date: Date): number {
    const jsDay = date.getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  /**
   * Vérifie si une date correspond à aujourd'hui
   */
  private isToday(year: number, month: number, day: number): boolean {
    const today = this.today;
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  }

  /**
   * Génère la liste des jours à afficher (mis en cache)
   */
  get days(): DayData[] {
    const cacheKey = `${this.currentYear}-${this.currentMonth}`;
    
    // Retourner le cache si la clé correspond
    if (this._cachedDays && this._cachedDaysKey === cacheKey) {
      return this._cachedDays;
    }

    const days = this.calculateDays();
    
    // Mettre en cache
    this._cachedDays = days;
    this._cachedDaysKey = cacheKey;
    
    return days;
  }

  /**
   * Charge les vacations pour le mois actuel
   */
  private loadVacations(): void {
    this.planningService.getVacationsForMonth(this.currentYear, this.currentMonth).subscribe({
      next: (response) => {
        this.vacations = response.vacations;
        // Créer un Map pour accéder rapidement aux vacations par date
        this.vacationsByDate.clear();
        this.vacations.forEach(vacation => {
          const dateKey = vacation.date.substring(0, 10); // YYYY-MM-DD
          if (!this.vacationsByDate.has(dateKey)) {
            this.vacationsByDate.set(dateKey, []);
          }
          this.vacationsByDate.get(dateKey)!.push(vacation);
        });
        // Invalider le cache des jours pour recalculer avec les nouvelles données
        this._cachedDays = null;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des vacations:', error);
        // En cas d'erreur, on continue avec un tableau vide
        this.vacations = [];
        this.vacationsByDate.clear();
        this._cachedDays = null;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Récupère la ville pour une date donnée
   */
  private getVilleForDate(year: number, month: number, day: number): string | undefined {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const vacations = this.vacationsByDate.get(dateKey);
    return vacations?.[0]?.ville;
  }

  /**
   * Calcule les jours à afficher pour le mois actuel
   */
  private calculateDays(): DayData[] {
    const days: DayData[] = [];
    
    // Obtenir le premier jour du mois et son index dans la semaine
    const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1);
    const firstDayIndex = this.getDayOfWeekIndex(firstDayOfMonth);
    
    // Calculer le mois précédent
    const prevMonth = this.currentMonth === 0 ? 11 : this.currentMonth - 1;
    const prevYear = this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    
    // Ajouter les jours du mois précédent (disabled)
    const startDay = daysInPrevMonth - firstDayIndex + 1;
    for (let i = startDay; i <= daysInPrevMonth; i++) {
      days.push(this.createDayData(i, 'repos', undefined, true, prevYear, prevMonth, i));
    }
    
    // Ajouter tous les jours du mois actuel
    for (let i = 1; i <= this.daysInMonth; i++) {
      const date = new Date(this.currentYear, this.currentMonth, i);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const ville = this.getVilleForDate(this.currentYear, this.currentMonth, i);
      const type: DayType = ville ? 'travail' : 'repos';
      days.push(this.createDayData(i, type, ville, false, this.currentYear, this.currentMonth, i));
    }
    
    // Calculer combien de jours il reste pour compléter 5 semaines
    const remainingDays = TOTAL_DAYS_TO_DISPLAY - days.length;
    
    // Calculer le mois suivant
    const nextMonth = this.currentMonth === 11 ? 0 : this.currentMonth + 1;
    const nextYear = this.currentMonth === 11 ? this.currentYear + 1 : this.currentYear;
    
    // Ajouter les jours du mois suivant (disabled)
    for (let i = 1; i <= remainingDays; i++) {
      days.push(this.createDayData(i, 'repos', undefined, true, nextYear, nextMonth, i));
    }
    
    return days;
  }

  /**
   * Crée un objet DayData avec toutes les propriétés nécessaires
   */
  private createDayData(
    dayNumber: number,
    type: DayType,
    location: string | undefined,
    disabled: boolean,
    year: number,
    month: number,
    day: number
  ): DayData {
    return {
      dayNumber,
      type,
      location,
      disabled,
      isToday: this.isToday(year, month, day),
      year,
      month,
    };
  }

  /**
   * Met à jour la date actuelle et invalide le cache
   */
  private updateCurrentDate(): void {
    this.currentDate = new Date(this.currentYear, this.currentMonth, 1);
    this._cachedDays = null; // Invalider le cache
    this._cachedMonthName = null; // Invalider le cache du nom du mois
    // Recharger les vacations pour le nouveau mois
    this.loadVacations();
    this.cdr.markForCheck();
  }

  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.updateCurrentDate();
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.updateCurrentDate();
  }

  onYearChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newYear = parseInt(select.value, 10);
    if (!isNaN(newYear) && newYear !== this.currentYear) {
      this.currentYear = newYear;
      this.updateCurrentDate();
    }
  }

  /**
   * Fonction de tracking pour optimiser le rendu de la liste des jours
   */
  trackByDay(index: number, day: DayData): string {
    // Utiliser une combinaison unique pour chaque jour
    return `${day.year}-${day.month}-${day.dayNumber}-${day.disabled ? 'disabled' : 'enabled'}-${day.isToday ? 'today' : 'normal'}`;
  }

  /**
   * Gère le clic sur un jour
   */
  onDayClick(event: { year: number; month: number; day: number }): void {
    // Formater la date au format YYYY-MM-DD pour la route
    const month = String(event.month + 1).padStart(2, '0');
    const day = String(event.day).padStart(2, '0');
    const dateStr = `${event.year}-${month}-${day}`;
    
    // Naviguer vers la page planning-day
    this.router.navigate(['/dashboard/planning', dateStr]);
  }
}

