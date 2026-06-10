import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, merge, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { AppIconComponent } from '../../../components/icon/app-icon.component';
import { UiBadgeComponent } from '../../../components/badge/ui-badge.component';
import { Site, SiteService, SitesResponse } from '../../../core/services/site.service';
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
  imports: [AppIconComponent, UiBadgeComponent],
  templateUrl: './dashboard-site-page.component.html',
  styleUrl: './dashboard-site-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardSitePageComponent implements OnInit {
  sites: SiteView[] = [];
  isLoading = true;
  searchTerm = '';

  private readonly search$ = new Subject<string>();
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private siteService: SiteService,
    private sanitizer: DomSanitizer,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Chargement initial immédiat (of('')) puis recherches utilisateur debouncées.
    merge(of(''), this.search$.pipe(debounceTime(250), distinctUntilChanged()))
      .pipe(
        switchMap((q) => {
          this.isLoading = true;
          this.cdr.markForCheck();
          return this.siteService.getSites(q).pipe(
            catchError(() => {
              this.notificationService.show('danger', 'Impossible de charger les sites');
              return of({ sites: [], count: 0 } as SitesResponse);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        this.sites = res.sites.map((site) => this.toView(site));
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.search$.next(value);
  }

  clearSearch(): void {
    if (this.searchTerm === '') {
      return;
    }
    this.searchTerm = '';
    this.search$.next('');
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
