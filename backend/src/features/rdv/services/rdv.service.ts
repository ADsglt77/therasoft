import { ModaliteType } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';
import { env } from '../../../config/env';
import { sendMail, logoAttachment } from '../../../lib/mailer';
import { bookingConfirmationEmail, bookingCancellationEmail, BookingEmailData } from '../../../lib/email-templates';
import { CreateBookingInput } from '../schemas/rdv.schemas';
import {
  OpeningHour,
  DEFAULT_DURATION_MIN,
  modaliteLabel,
  toMinutes,
  fromMinutes,
  timeDateToMinutes,
  timeStrToDate,
  isoWeekdayUtc,
  utcDateKey,
  haversineKm,
} from '../rdv.utils';

export interface Slot {
  heureDebut: string;
  heureFin: string;
}

export interface BookingResponse {
  id: number;
  date: Date;
  heureDebut: Date;
  heureFin: Date;
  modalite: string;
  motif: string | null;
  site: { id: number; nom: string; ville: string } | null;
  medecin: { id: number; nom: string; prenom: string } | null;
}

const bookingSelect = {
  id: true,
  date: true,
  heureDebut: true,
  heureFin: true,
  modalite: true,
  motif: true,
  site: { select: { id: true, nom: true, ville: true } },
  medecin: { select: { id: true, nom: true, prenom: true } },
} as const;

export class RdvService {
  /** Types de RDV proposables (modalité + durée). */
  async getTypes() {
    return prisma.modaliteConfig.findMany({
      select: { modalite: true, dureeMinutes: true },
      orderBy: { dureeMinutes: 'asc' },
    });
  }

  /** Médecin rattaché + ses sites, triés par distance depuis l'adresse du patient. */
  async getBookingSites(patientId: number) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { medecinId: true, latitude: true, longitude: true },
    });
    if (!patient?.medecinId) {
      return { medecin: null, sites: [] };
    }
    const [medecin, sites] = await Promise.all([
      prisma.medecin.findUnique({
        where: { id: patient.medecinId },
        select: { id: true, nom: true, prenom: true, specialite: true },
      }),
      prisma.site.findMany({
        where: { vacations: { some: { medecinId: patient.medecinId } } },
        select: { id: true, nom: true, ville: true, latitude: true, longitude: true },
      }),
    ]);

    const hasPatientCoords = patient.latitude != null && patient.longitude != null;
    const withDistance = sites.map((s) => ({
      id: s.id,
      nom: s.nom,
      ville: s.ville,
      distanceKm:
        hasPatientCoords && s.latitude != null && s.longitude != null
          ? Math.round(haversineKm(patient.latitude!, patient.longitude!, s.latitude, s.longitude) * 10) / 10
          : null,
    }));

    // Tri par distance croissante ; les sites sans coordonnées (ou patient sans adresse) en alphabétique.
    withDistance.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) {
        return a.ville.localeCompare(b.ville) || a.nom.localeCompare(b.nom);
      }
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    return { medecin, sites: withDistance };
  }

  /** Dates du mois où le médecin a une vacation à ce lieu (jours réservables). */
  async getAvailableDates(patientId: number, siteId: number, year: number, month: number) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { medecinId: true },
    });
    if (!patient?.medecinId) {
      return { dates: [] as string[] };
    }
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));
    const vacations = await prisma.vacation.findMany({
      where: { medecinId: patient.medecinId, siteId, date: { gte: start, lte: end } },
      select: { date: true },
      distinct: ['date'],
    });
    return { dates: vacations.map((v) => utcDateKey(v.date)) };
  }

  /** Créneaux disponibles : horaires du site découpés par la durée, moins les RDV pris. */
  async getAvailableSlots(
    patientId: number,
    siteId: number,
    modalite: ModaliteType,
    date: Date
  ): Promise<Slot[]> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { medecinId: true },
    });
    if (!patient?.medecinId) {
      return [];
    }

    // Le médecin doit avoir une vacation à ce lieu ce jour-là.
    const vacation = await prisma.vacation.findFirst({
      where: { medecinId: patient.medecinId, siteId, date },
      select: { id: true },
    });
    if (!vacation) {
      return [];
    }

    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { openingHours: true },
    });
    const hours = (site?.openingHours as unknown as OpeningHour[] | null) ?? [];
    const todayHours = hours.find((h) => h.day === isoWeekdayUtc(date));
    if (!todayHours) {
      return [];
    }

    const config = await prisma.modaliteConfig.findUnique({
      where: { modalite },
      select: { dureeMinutes: true },
    });
    const duration = config?.dureeMinutes ?? DEFAULT_DURATION_MIN;

    // RDV existants du médecin ce jour (créneaux occupés).
    const rdvs = await prisma.rdv.findMany({
      where: {
        date,
        OR: [
          { medecinId: patient.medecinId },
          { vacationLinks: { some: { vacation: { medecinId: patient.medecinId } } } },
        ],
      },
      select: { heureDebut: true, heureFin: true },
    });
    const busy = rdvs.map((r) => ({
      start: timeDateToMinutes(r.heureDebut),
      end: timeDateToMinutes(r.heureFin),
    }));

    // Créneaux passés exclus si la date est aujourd'hui.
    const now = new Date();
    const isToday = utcDateKey(date) === utcDateKey(now);
    const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();

    const openMin = toMinutes(todayHours.open);
    const closeMin = toMinutes(todayHours.close);

    const slots: Slot[] = [];
    for (let s = openMin; s + duration <= closeMin; s += duration) {
      const e = s + duration;
      if (busy.some((b) => s < b.end && e > b.start)) {
        continue;
      }
      if (isToday && s < nowMin) {
        continue;
      }
      slots.push({ heureDebut: fromMinutes(s), heureFin: fromMinutes(e) });
    }
    return slots;
  }

  async createBooking(patientId: number, input: CreateBookingInput, baseUrl: string = env.appUrl): Promise<BookingResponse> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { medecinId: true, emailVerified: true, email: true, prenom: true },
    });
    if (!patient?.medecinId) {
      throw new ApiError('Aucun médecin rattaché à votre compte', 'BOOKING_NO_MEDECIN', 400);
    }
    if (!patient.emailVerified) {
      throw new ApiError('Veuillez vérifier votre adresse email avant de réserver', 'AUTH_EMAIL_NOT_VERIFIED', 403);
    }

    // Re-vérification serveur : le créneau doit toujours être disponible.
    const slots = await this.getAvailableSlots(patientId, input.siteId, input.modalite, input.date);
    const slot = slots.find((s) => s.heureDebut === input.heureDebut);
    if (!slot) {
      throw new ApiError("Ce créneau n'est plus disponible", 'BOOKING_SLOT_UNAVAILABLE', 409);
    }

    const booking = await prisma.rdv.create({
      data: {
        date: input.date,
        heureDebut: timeStrToDate(slot.heureDebut),
        heureFin: timeStrToDate(slot.heureFin),
        modalite: input.modalite,
        motif: input.motif || null,
        patientId,
        medecinId: patient.medecinId,
        siteId: input.siteId,
        // Dossier vide : le médecin pourra l'ouvrir depuis son planning.
        dossier: { create: {} },
      },
      select: bookingSelect,
    });

    // Email de confirmation (ne bloque pas la réservation si l'envoi échoue).
    if (patient.email) {
      const data = this.bookingEmailData(booking, patient.prenom, `${baseUrl}/mes-rendez-vous`);
      const mail = bookingConfirmationEmail(data);
      sendMail({ to: patient.email, ...mail, attachments: logoAttachment() }).catch((err) =>
        console.error('Email de confirmation RDV échoué :', err)
      );
    }

    return booking;
  }

  async getMyBookings(patientId: number): Promise<BookingResponse[]> {
    return prisma.rdv.findMany({
      where: { patientId },
      select: bookingSelect,
      orderBy: [{ date: 'desc' }, { heureDebut: 'desc' }],
    });
  }

  async cancelBooking(patientId: number, rdvId: number, baseUrl: string = env.appUrl): Promise<void> {
    const rdv = await prisma.rdv.findUnique({
      where: { id: rdvId },
      select: {
        id: true,
        patientId: true,
        date: true,
        heureDebut: true,
        heureFin: true,
        modalite: true,
        site: { select: { nom: true, ville: true } },
        medecin: { select: { nom: true, prenom: true } },
        patient: { select: { email: true, prenom: true } },
      },
    });
    if (!rdv || rdv.patientId !== patientId) {
      throw new ApiError('Rendez-vous introuvable', 'NOT_FOUND', 404);
    }
    await prisma.rdv.delete({ where: { id: rdvId } });

    // Email d'annulation (ne bloque pas l'annulation si l'envoi échoue).
    if (rdv.patient?.email) {
      const data = this.bookingEmailData(rdv, rdv.patient.prenom, `${baseUrl}/prendre-rendez-vous`);
      const mail = bookingCancellationEmail(data);
      sendMail({ to: rdv.patient.email, ...mail, attachments: logoAttachment() }).catch((err) =>
        console.error("Email d'annulation RDV échoué :", err)
      );
    }
  }

  /** Construit les données d'email à partir d'un RDV (dates en UTC, libellés FR). */
  private bookingEmailData(
    booking: {
      date: Date;
      heureDebut: Date;
      heureFin: Date;
      modalite: string;
      site: { nom: string; ville: string } | null;
      medecin: { nom: string; prenom: string } | null;
    },
    prenom: string,
    link: string
  ): BookingEmailData {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return {
      prenom,
      modaliteLabel: modaliteLabel(booking.modalite),
      dateLabel: cap(
        booking.date.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
      ),
      timeLabel: `${fromMinutes(timeDateToMinutes(booking.heureDebut))} – ${fromMinutes(timeDateToMinutes(booking.heureFin))}`,
      siteLabel: booking.site ? `${booking.site.nom} — ${booking.site.ville}` : '—',
      medecinLabel: booking.medecin ? `Dr ${booking.medecin.prenom} ${booking.medecin.nom}` : '—',
      link,
    };
  }
}

export const rdvService = new RdvService();
