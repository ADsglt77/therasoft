import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { MonthCalendarComponent } from '../../../components/calendar/month/month-calendar/month-calendar.component';
import { NavCalendarComponent } from '../../../components/calendar/nav-calendar/nav-calendar.component';
import { UiStepperComponent, StepperStep } from '../../../components/stepper/ui-stepper.component';
import { BookingService, BookingMedecin, BookingSite, BookingType, Slot } from '../../../core/services/booking.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { formatDateKey, formatDateLong, formatTime } from '../../../core/utils/date.utils';
import { getModaliteUi } from '../../../core/constants/modalite.constants';

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
    MonthCalendarComponent,
    NavCalendarComponent,
    UiStepperComponent,
  ],
  templateUrl: './dashboard-prendre-rdv-page.component.html',
  styleUrl: './dashboard-prendre-rdv-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPrendreRdvPageComponent implements OnInit {
  medecin: BookingMedecin | null = null;
  types: BookingType[] = [];
  sites: BookingSite[] = [];
  siteSearch = '';

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

  // Vérification d'email : la réservation est bloquée tant que l'email n'est pas vérifié.
  isVerified = true;
  patientEmail = '';
  isResending = false;

  private calYear = new Date().getFullYear();
  private calMonth = new Date().getMonth();
  private availableDatesRequest = 0;
  private slotsRequest = 0;

  readonly formatTime = formatTime;

  constructor(
    private bookingService: BookingService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadVerificationStatus();

    this.bookingService.getTypes().subscribe({
      next: ({ types }) => {
        this.types = types;
        this.cdr.markForCheck();
      },
      error: () => this.notificationService.show('danger', 'Impossible de charger les types de rendez-vous'),
    });
    this.bookingService.getBookingSites().subscribe({
      next: ({ medecin, sites }) => {
        this.medecin = medecin;
        this.sites = sites;
        this.cdr.markForCheck();
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

  /** Lieux filtrés par la barre de recherche (nom ou ville). */
  get filteredSites(): BookingSite[] {
    const q = this.siteSearch.trim().toLowerCase();
    return q ? this.sites.filter((s) => `${s.nom} ${s.ville}`.toLowerCase().includes(q)) : this.sites;
  }

  /** Distance lisible (« 3,2 km » / « 248 km »). */
  distanceLabel(km: number): string {
    return km >= 10
      ? `${Math.round(km)} km`
      : `${km.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
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
    this.availableDatesRequest++;
    this.slotsRequest++;
    this.selectedModalite = modalite;
    this.selectedSiteId = null;
    this.selectedSiteLabel = null;
    this.selectedDate = null;
    this.selectedSlot = null;
    this.availableDates = new Set();
    this.slots = [];
    this.currentStep = 1;
  }

  selectSite(site: BookingSite): void {
    this.selectedSiteId = site.id;
    this.selectedSiteLabel = `${site.nom} — ${site.ville}`;
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
    this.selectedDate = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
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
          if (err?.error?.error?.code === 'AUTH_EMAIL_NOT_VERIFIED') {
            this.isVerified = false;
          }
          this.notificationService.show('danger', err?.error?.error?.message || 'La réservation a échoué');
          this.selectedSlot = null;
          this.loadSlots();
          this.cdr.markForCheck();
        },
      });
  }

  // ---- Vérification d'email ----
  resend(): void {
    if (this.isResending) {
      return;
    }
    this.isResending = true;
    this.authService.resendVerification().subscribe({
      next: () => {
        this.isResending = false;
        this.notificationService.show('success', `Email de vérification renvoyé à ${this.patientEmail}`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isResending = false;
        this.notificationService.show('danger', "L'envoi de l'email a échoué");
        this.cdr.markForCheck();
      },
    });
  }

  checkAgain(): void {
    this.authService.getMe().subscribe({
      next: (user) => {
        this.isVerified = user.emailVerified !== false;
        this.patientEmail = user.email ?? this.patientEmail;
        this.notificationService.show(
          this.isVerified ? 'success' : 'information',
          this.isVerified ? 'Adresse email vérifiée' : "Votre email n'est pas encore vérifié"
        );
        this.cdr.markForCheck();
      },
      error: () => this.notificationService.show('danger', 'Impossible de vérifier le statut'),
    });
  }

  private loadVerificationStatus(): void {
    this.authService.getMe().subscribe({
      next: (user) => {
        this.isVerified = user.emailVerified !== false;
        this.patientEmail = user.email ?? this.patientEmail;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  private shortDate(dateKey: string): string {
    const d = new Date(`${dateKey}T00:00:00`);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  private loadAvailableDates(): void {
    if (this.selectedSiteId == null || this.selectedModalite == null) {
      return;
    }
    const request = ++this.availableDatesRequest;
    const siteId = this.selectedSiteId;
    const modalite = this.selectedModalite;
    this.bookingService.getAvailableDates(
      siteId,
      modalite,
      this.calYear,
      this.calMonth + 1
    ).subscribe({
      next: ({ dates }) => {
        if (request !== this.availableDatesRequest) {
          return;
        }
        this.availableDates = new Set(dates);
        this.cdr.markForCheck();
      },
      error: () => {
        if (request !== this.availableDatesRequest) {
          return;
        }
        this.availableDates = new Set();
        this.cdr.markForCheck();
      },
    });
  }

  private loadSlots(): void {
    if (this.selectedSiteId == null || this.selectedModalite == null || this.selectedDate == null) {
      return;
    }
    const request = ++this.slotsRequest;
    const siteId = this.selectedSiteId;
    const modalite = this.selectedModalite;
    const date = this.selectedDate;
    this.isLoadingSlots = true;
    this.bookingService.getAvailableSlots(siteId, modalite, date).subscribe({
      next: ({ slots }) => {
        if (request !== this.slotsRequest) {
          return;
        }
        this.slots = slots;
        this.isLoadingSlots = false;
        this.cdr.markForCheck();
      },
      error: () => {
        if (request !== this.slotsRequest) {
          return;
        }
        this.slots = [];
        this.isLoadingSlots = false;
        this.cdr.markForCheck();
      },
    });
  }
}
