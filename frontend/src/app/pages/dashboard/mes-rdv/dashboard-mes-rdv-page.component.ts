import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiBadgeComponent } from '../../../components/badge/ui-badge.component';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { BookingService, Booking } from '../../../core/services/booking.service';
import { NotificationService } from '../../../core/services/notification.service';
import { formatDateLong, formatTime } from '../../../core/utils/date.utils';
import { getModaliteUi } from '../../../core/constants/modalite.constants';

interface BookingView {
  data: Booking;
  dateLabel: string;
  timeLabel: string;
  modaliteLabel: string;
  isPast: boolean;
  startMs: number;
}

/**
 * Page dédiée « Mes rendez-vous » : liste des RDV du patient,
 * séparés en « À venir » et « Passés », avec annulation des RDV à venir.
 */
@Component({
  selector: 'app-dashboard-mes-rdv-page',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, AppIconComponent, UiBadgeComponent, UiButtonComponent],
  templateUrl: './dashboard-mes-rdv-page.component.html',
  styleUrl: './dashboard-mes-rdv-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardMesRdvPageComponent implements OnInit {
  upcoming: BookingView[] = [];
  past: BookingView[] = [];
  isLoading = true;

  constructor(
    private bookingService: BookingService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  modaliteIcon(modalite: string): string {
    return getModaliteUi(modalite).icon;
  }

  cancel(rdvId: number): void {
    this.bookingService.cancelBooking(rdvId).subscribe({
      next: () => {
        this.notificationService.show('success', 'Rendez-vous annulé');
        this.upcoming = this.upcoming.filter((b) => b.data.id !== rdvId);
        this.cdr.markForCheck();
      },
      error: () => this.notificationService.show('danger', "L'annulation a échoué"),
    });
  }

  private loadBookings(): void {
    this.isLoading = true;
    this.bookingService.getMyBookings().subscribe({
      next: ({ rdvs }) => {
        const views = rdvs.map((r) => this.toView(r));
        this.upcoming = views.filter((v) => !v.isPast).sort((a, b) => a.startMs - b.startMs);
        this.past = views.filter((v) => v.isPast).sort((a, b) => b.startMs - a.startMs);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.notificationService.show('danger', 'Impossible de charger vos rendez-vous');
        this.cdr.markForCheck();
      },
    });
  }

  private toView(rdv: Booking): BookingView {
    const start = new Date(rdv.date);
    const time = new Date(rdv.heureDebut);
    start.setHours(time.getHours(), time.getMinutes(), 0, 0);
    const startMs = start.getTime();
    return {
      data: rdv,
      dateLabel: formatDateLong(rdv.date),
      timeLabel: `${formatTime(rdv.heureDebut)} – ${formatTime(rdv.heureFin)}`,
      modaliteLabel: getModaliteUi(rdv.modalite).label,
      isPast: startMs < Date.now(),
      startMs,
    };
  }
}
