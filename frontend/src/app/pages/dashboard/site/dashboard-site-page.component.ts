import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiBadgeComponent } from '../../../components/badge/ui-badge.component';
import { UiButtonComponent } from '../../../components/button/ui-button.component';
import { Site, SiteService } from '../../../core/services/site.service';
import { NotificationService } from '../../../core/services/notification.service';
import { getModaliteUi } from '../../../core/constants/modalite.constants';
import { formatDateLong } from '../../../core/utils/date.utils';
import {
  siteQuery,
  mapsEmbedUrl,
  mapsDirectionsUrl,
  mapsPlaceUrl,
} from '../../../core/utils/maps.utils';

interface OpeningHourView {
  label: string;
  hours: string;
}

interface ModaliteView {
  icon: string;
  label: string;
}

/** Modèle de vue pré-calculé pour chaque carte de site. */
interface SiteView {
  data: Site;
  embedUrl: SafeResourceUrl;
  directionsUrl: string;
  infoUrl: string;
  infoLabel: string;
  modalites: ModaliteView[];
  openingHours: OpeningHourView[];
  nextVacationLabel: string | null;
}

const JOURS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/**
 * Page Site : pour chaque établissement où le médecin a des vacations,
 * affiche la localisation (Google Maps), les liens d'accès, les horaires
 * et les statistiques de rendez-vous.
 */
@Component({
  selector: 'app-dashboard-site-page',
  standalone: true,
  imports: [AppIconComponent, UiBadgeComponent, UiButtonComponent],
  templateUrl: './dashboard-site-page.component.html',
  styleUrl: './dashboard-site-page.component.scss',
})
export class DashboardSitePageComponent implements OnInit {
  sites: SiteView[] = [];
  isLoading = true;

  constructor(
    private siteService: SiteService,
    private sanitizer: DomSanitizer,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.siteService.getSites().subscribe({
      next: (res) => {
        this.sites = res.sites.map((site) => this.toView(site));
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.notificationService.show('danger', 'Impossible de charger les sites');
      },
    });
  }

  private toView(site: Site): SiteView {
    const query = siteQuery(site);
    return {
      data: site,
      embedUrl: this.sanitizer.bypassSecurityTrustResourceUrl(mapsEmbedUrl(query)),
      directionsUrl: mapsDirectionsUrl(query),
      infoUrl: site.websiteUrl ?? mapsPlaceUrl(query),
      infoLabel: site.websiteUrl ? 'Site web' : "Plus d'infos",
      modalites: site.modalites.map((m) => getModaliteUi(m)),
      openingHours: (site.openingHours ?? [])
        .slice()
        .sort((a, b) => a.day - b.day)
        .map((h) => ({
          label: JOURS[h.day] ?? `Jour ${h.day}`,
          hours: `${h.open} – ${h.close}`,
        })),
      nextVacationLabel: site.nextVacationDate ? formatDateLong(site.nextVacationDate) : null,
    };
  }
}
