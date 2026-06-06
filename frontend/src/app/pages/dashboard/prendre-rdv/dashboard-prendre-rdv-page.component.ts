import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { UiComboboxComponent } from '../../../components/combobox/ui-combobox.component';
import { MonthCalendarComponent } from '../../../components/calendar/month/month-calendar/month-calendar.component';
import { NavCalendarComponent } from '../../../components/calendar/nav-calendar/nav-calendar.component';
import { UiStepperComponent, StepperStep } from '../../../components/stepper/ui-stepper.component';
import { SelectOption } from '../../../components/input/ui-input.component';
import { BookingService, BookingMedecin, BookingType, Slot } from '../../../core/services/booking.service';
import { NotificationService } from '../../../core/services/notification.service';
import { formatDateLong, formatTime } from '../../../core/utils/date.utils';
import { getModaliteUi } from '../../../core/constants/modalite.constants';

const STEP_TITLES = ['Type de rendez-vous', 'Lieu', 'Date', 'Créneau'] as const;
const STEP_DESCRIPTIONS = [
  "Choisissez le type d'examen souhaité.",
  'Sélectionnez le lieu de votre rendez-vous.',
  'Choisissez une date disponible.',
  'Sélectionnez un créneau horaire puis confirmez.',
] as const;

/**
 * Prise de rendez-vous sous forme de parcours guidé (wizard) :
 * Type → Lieu → Date → Créneau, avec indicateur de progression et confirmation finale.
 * Les créneaux affichés sont réellement disponibles (vacation médecin + horaires site − RDV pris).
 */
@Component({
  selector: 'app-dashboard-prendre-rdv-page',
  standalone: true,
  imports: [
    AppIconComponent,
    UiButtonComponent,
    UiComboboxComponent,
    MonthCalendarComponent,
    NavCalendarComponent,
    UiStepperComponent,
  ],
  templateUrl: './dashboard-prendre-rdv-page.component.html',
  styleUrl: './dashboard-prendre-rdv-page.component.scss',
})
export class DashboardPrendreRdvPageComponent implements OnInit {
  medecin: BookingMedecin | null = null;
  types: BookingType[] = [];
  siteOptions: SelectOption[] = [];

  // Sélections du parcours
  currentStep = 0;
  selectedModalite: string | null = null;
  selectedSiteId: number | null = null;
  selectedSiteLabel: string | null = null;
  selectedDate: string | null = null;
  selectedSlot: Slot | null = null;

  availableDates = new Set<string>();
  slots: Slot[] = [];
  isLoadingSlots = false;
  isSubmitting = false;

  private calYear = new Date().getFullYear();
  private calMonth = new Date().getMonth();

  readonly formatTime = formatTime;
  readonly stepTitles = STEP_TITLES;
  readonly stepDescriptions = STEP_DESCRIPTIONS;

  constructor(
    private bookingService: BookingService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.bookingService.getTypes().subscribe({
      next: ({ types }) => (this.types = types),
      error: () => this.notificationService.show('danger', 'Impossible de charger les types de rendez-vous'),
    });
    this.bookingService.getBookingSites().subscribe({
      next: ({ medecin, sites }) => {
        this.medecin = medecin;
        this.siteOptions = sites.map((s) => ({ value: s.id, label: `${s.nom} — ${s.ville}` }));
      },
      error: () => this.notificationService.show('danger', 'Impossible de charger les lieux'),
    });
  }

  // ---- Indicateur de progression ----
  get steps(): StepperStep[] {
    return [
      {
        label: 'Type',
        value: this.selectedModalite ? this.modaliteLabel(this.selectedModalite) : null,
        done: !!this.selectedModalite,
      },
      { label: 'Lieu', value: this.selectedSiteLabel, done: this.selectedSiteId != null },
      { label: 'Date', value: this.selectedDate ? this.shortDate(this.selectedDate) : null, done: !!this.selectedDate },
      { label: 'Créneau', value: this.selectedSlot?.heureDebut ?? null, done: !!this.selectedSlot },
    ];
  }

  /** Index maximal atteignable : la première étape incomplète. */
  get maxReachableStep(): number {
    if (!this.selectedModalite) return 0;
    if (this.selectedSiteId == null) return 1;
    if (!this.selectedDate) return 2;
    return 3;
  }

  get currentStepComplete(): boolean {
    return this.steps[this.currentStep]?.done ?? false;
  }

  get dayHeader(): { dayOfWeek: string; monthName: string; dayNumber: number } {
    if (!this.selectedDate) {
      return { dayOfWeek: '', monthName: '', dayNumber: 0 };
    }
    const d = new Date(`${this.selectedDate}T00:00:00`);
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return {
      dayOfWeek: cap(d.toLocaleDateString('fr-FR', { weekday: 'long' })),
      monthName: cap(d.toLocaleDateString('fr-FR', { month: 'long' })),
      dayNumber: d.getDate(),
    };
  }

  get bookingSummary(): string | null {
    if (!this.selectedModalite || !this.selectedSiteLabel || !this.selectedDate || !this.selectedSlot) {
      return null;
    }
    return `${this.modaliteLabel(this.selectedModalite)} · le ${formatDateLong(
      `${this.selectedDate}T00:00:00`
    )} à ${formatTime(this.selectedSlot.heureDebut)} · ${this.selectedSiteLabel}`;
  }

  // ---- Étapes ----
  modaliteIcon(modalite: string): string {
    return getModaliteUi(modalite).icon;
  }
  modaliteLabel(modalite: string): string {
    return getModaliteUi(modalite).label;
  }

  selectType(modalite: string): void {
    this.selectedModalite = modalite;
    this.selectedSlot = null;
    this.slots = [];
    this.currentStep = 1;
  }

  selectSite(value: string): void {
    this.selectedSiteId = Number(value);
    this.selectedSiteLabel = this.siteOptions.find((o) => String(o.value) === value)?.label ?? null;
    this.selectedDate = null;
    this.selectedSlot = null;
    this.slots = [];
    this.loadAvailableDates();
    this.currentStep = 2;
  }

  onMonthChange(e: { year: number; month: number }): void {
    this.calYear = e.year;
    this.calMonth = e.month;
    this.loadAvailableDates();
  }

  selectDate(dateKey: string): void {
    this.selectedDate = dateKey;
    this.selectedSlot = null;
    this.currentStep = 3;
    this.loadSlots();
  }

  selectSlot(slot: Slot): void {
    this.selectedSlot = slot;
  }

  shiftDay(delta: number): void {
    if (!this.selectedDate) {
      return;
    }
    const d = new Date(`${this.selectedDate}T00:00:00`);
    d.setDate(d.getDate() + delta);
    this.selectedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.selectedSlot = null;
    this.loadSlots();
  }

  goToStep(index: number): void {
    if (index < 0 || index > this.maxReachableStep) {
      return;
    }
    this.currentStep = index;
    if (index === 3) {
      this.loadSlots();
    }
  }

  next(): void {
    if (this.currentStep < 3 && this.currentStepComplete) {
      this.goToStep(this.currentStep + 1);
    }
  }

  prev(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  confirm(): void {
    if (this.selectedSiteId == null || this.selectedModalite == null || this.selectedDate == null || !this.selectedSlot || this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;
    this.bookingService
      .createBooking({
        siteId: this.selectedSiteId,
        date: this.selectedDate,
        heureDebut: this.selectedSlot.heureDebut,
        modalite: this.selectedModalite,
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notificationService.show('success', 'Rendez-vous réservé');
          this.router.navigate(['/mes-rendez-vous']);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notificationService.show('danger', err?.error?.error?.message || 'La réservation a échoué');
          this.selectedSlot = null;
          this.loadSlots();
        },
      });
  }

  private shortDate(dateKey: string): string {
    const d = new Date(`${dateKey}T00:00:00`);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  private loadAvailableDates(): void {
    if (this.selectedSiteId == null) {
      return;
    }
    this.bookingService.getAvailableDates(this.selectedSiteId, this.calYear, this.calMonth + 1).subscribe({
      next: ({ dates }) => (this.availableDates = new Set(dates)),
      error: () => (this.availableDates = new Set()),
    });
  }

  private loadSlots(): void {
    if (this.selectedSiteId == null || this.selectedModalite == null || this.selectedDate == null) {
      return;
    }
    this.isLoadingSlots = true;
    this.bookingService.getAvailableSlots(this.selectedSiteId, this.selectedModalite, this.selectedDate).subscribe({
      next: ({ slots }) => {
        this.slots = slots;
        this.isLoadingSlots = false;
      },
      error: () => {
        this.slots = [];
        this.isLoadingSlots = false;
      },
    });
  }
}
