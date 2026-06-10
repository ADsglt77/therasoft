import { ModaliteType, Prisma } from '@prisma/client';
import { env } from '../../../config/env';
import {
  bookingCancellationEmail,
  bookingConfirmationEmail,
  BookingEmailData,
} from '../../../lib/email-templates';
import { parisDateKey, parisTimeMinutes } from '../../../lib/dates';
import { removeDossierFiles } from '../../../lib/dossier-storage';
import { logoAttachment, sendMail } from '../../../lib/mailer';
import { openingHoursForDay } from '../../../lib/opening-hours';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';
import { CreateBookingInput } from '../schemas/rdv.schemas';
import {
  DEFAULT_DURATION_MIN,
  fromMinutes,
  haversineKm,
  isoWeekdayUtc,
  modaliteLabel,
  timeDateToMinutes,
  timeStrToDate,
  toMinutes,
  utcDateKey,
} from '../rdv.utils';

interface Slot {
  heureDebut: string;
  heureFin: string;
}

interface BookingResponse {
  id: number;
  date: Date;
  heureDebut: Date;
  heureFin: Date;
  modalite: string;
  motif: string | null;
  site: { id: number; nom: string; ville: string } | null;
  medecin: { id: number; nom: string; prenom: string } | null;
}

type AvailabilityClient = Pick<
  Prisma.TransactionClient,
  'vacation' | 'site' | 'modaliteConfig' | 'rdv'
>;

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

class RdvService {
  async getTypes() {
    const configs = await prisma.modaliteConfig.findMany({
      select: { modalite: true, dureeMinutes: true },
      orderBy: { dureeMinutes: 'asc' },
    });
    return configs.map((config) => ({
      ...config,
      dureeMinutes:
        Number.isInteger(config.dureeMinutes) && config.dureeMinutes > 0
          ? config.dureeMinutes
          : DEFAULT_DURATION_MIN,
    }));
  }

  async getBookingSites(patientId: number) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        medecinId: true,
        latitude: true,
        longitude: true,
        medecin: { select: { isActive: true } },
      },
    });
    if (!patient?.medecinId || !patient.medecin?.isActive) {
      return { medecin: null, sites: [] };
    }

    const today = new Date(`${parisDateKey()}T00:00:00.000Z`);
    const [medecin, sites] = await Promise.all([
      prisma.medecin.findUnique({
        where: { id: patient.medecinId },
        select: { id: true, nom: true, prenom: true },
      }),
      prisma.site.findMany({
        where: {
          vacations: { some: { medecinId: patient.medecinId, date: { gte: today } } },
        },
        select: { id: true, nom: true, ville: true, latitude: true, longitude: true },
      }),
    ]);

    const hasPatientCoords = patient.latitude != null && patient.longitude != null;
    const withDistance = sites.map((site) => ({
      id: site.id,
      nom: site.nom,
      ville: site.ville,
      distanceKm:
        hasPatientCoords && site.latitude != null && site.longitude != null
          ? Math.round(
              haversineKm(patient.latitude!, patient.longitude!, site.latitude, site.longitude) * 10
            ) / 10
          : null,
    }));

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

  async getAvailableDates(
    patientId: number,
    siteId: number,
    modalite: ModaliteType,
    year: number,
    month: number
  ) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { medecinId: true, medecin: { select: { isActive: true } } },
    });
    if (!patient?.medecinId || !patient.medecin?.isActive) {
      return { dates: [] as string[] };
    }

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));
    const today = new Date(`${parisDateKey()}T00:00:00.000Z`);
    const start = monthStart > today ? monthStart : today;
    if (start > monthEnd) {
      return { dates: [] as string[] };
    }

    const vacations = await prisma.vacation.findMany({
      where: {
        medecinId: patient.medecinId,
        siteId,
        modalite,
        date: { gte: start, lte: monthEnd },
      },
      select: { date: true },
      distinct: ['date'],
    });
    return { dates: vacations.map((vacation) => utcDateKey(vacation.date)) };
  }

  async getAvailableSlots(
    patientId: number,
    siteId: number,
    modalite: ModaliteType,
    date: Date
  ): Promise<Slot[]> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { medecinId: true, medecin: { select: { isActive: true } } },
    });
    if (!patient?.medecinId || !patient.medecin?.isActive) {
      return [];
    }
    return this.findAvailableSlots(prisma, patient.medecinId, siteId, modalite, date);
  }

  private async findAvailableSlots(
    db: AvailabilityClient,
    medecinId: number,
    siteId: number,
    modalite: ModaliteType,
    date: Date
  ): Promise<Slot[]> {
    const dateKey = utcDateKey(date);
    if (dateKey < parisDateKey()) {
      return [];
    }

    const vacation = await db.vacation.findFirst({
      where: { medecinId, siteId, modalite, date },
      select: { id: true },
    });
    if (!vacation) {
      return [];
    }

    const site = await db.site.findUnique({
      where: { id: siteId },
      select: { openingHours: true },
    });
    const todayHours = openingHoursForDay(site?.openingHours, isoWeekdayUtc(date));
    if (!todayHours) {
      return [];
    }

    const config = await db.modaliteConfig.findUnique({
      where: { modalite },
      select: { dureeMinutes: true },
    });
    const duration =
      config && Number.isInteger(config.dureeMinutes) && config.dureeMinutes > 0
        ? config.dureeMinutes
        : DEFAULT_DURATION_MIN;

    const rdvs = await db.rdv.findMany({
      where: {
        date,
        OR: [{ medecinId }, { vacationLinks: { some: { vacation: { medecinId } } } }],
      },
      select: { heureDebut: true, heureFin: true },
    });
    const busy = rdvs.map((rdv) => ({
      start: timeDateToMinutes(rdv.heureDebut),
      end: timeDateToMinutes(rdv.heureFin),
    }));

    const isToday = dateKey === parisDateKey();
    const currentMinutes = parisTimeMinutes();
    const openMinutes = toMinutes(todayHours.open);
    const closeMinutes = toMinutes(todayHours.close);

    const slots: Slot[] = [];
    for (let start = openMinutes; start + duration <= closeMinutes; start += duration) {
      const end = start + duration;
      if (busy.some((range) => start < range.end && end > range.start)) {
        continue;
      }
      if (isToday && start < currentMinutes) {
        continue;
      }
      slots.push({ heureDebut: fromMinutes(start), heureFin: fromMinutes(end) });
    }
    return slots;
  }

  async createBooking(
    patientId: number,
    input: CreateBookingInput,
    baseUrl: string = env.appUrl
  ): Promise<BookingResponse> {
    const result = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: { id: patientId },
        select: {
          medecinId: true,
          medecin: { select: { isActive: true } },
          prenom: true,
          user: { select: { email: true, emailVerified: true } },
        },
      });
      if (!patient?.medecinId || !patient.medecin?.isActive) {
        throw new ApiError('Aucun medecin rattache a votre compte', 'BOOKING_NO_MEDECIN', 400);
      }
      if (!patient.user?.emailVerified) {
        throw new ApiError(
          'Veuillez verifier votre adresse email avant de reserver',
          'AUTH_EMAIL_NOT_VERIFIED',
          403
        );
      }

      const dateLockKey = Number(utcDateKey(input.date).replaceAll('-', ''));
      // $executeRaw (et non $queryRaw) : pg_advisory_xact_lock renvoie `void`, que
      // l'adaptateur pg de Prisma ne sait pas désérialiser en colonne de résultat.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${patient.medecinId}, ${dateLockKey})`;

      const slots = await this.findAvailableSlots(
        tx,
        patient.medecinId,
        input.siteId,
        input.modalite,
        input.date
      );
      const slot = slots.find((candidate) => candidate.heureDebut === input.heureDebut);
      if (!slot) {
        throw new ApiError("Ce creneau n'est plus disponible", 'BOOKING_SLOT_UNAVAILABLE', 409);
      }

      const booking = await tx.rdv.create({
        data: {
          date: input.date,
          heureDebut: timeStrToDate(slot.heureDebut),
          heureFin: timeStrToDate(slot.heureFin),
          modalite: input.modalite,
          motif: input.motif || null,
          patientId,
          medecinId: patient.medecinId,
          siteId: input.siteId,
          dossier: { create: {} },
        },
        select: bookingSelect,
      });

      return { booking, patient };
    });

    if (result.patient.user?.email) {
      const data = this.bookingEmailData(
        result.booking,
        result.patient.prenom,
        `${baseUrl}/mes-rendez-vous`
      );
      const mail = bookingConfirmationEmail(data);
      void sendMail({
        to: result.patient.user.email,
        ...mail,
        attachments: logoAttachment(),
      });
    }

    return result.booking;
  }

  async getMyBookings(patientId: number): Promise<BookingResponse[]> {
    return prisma.rdv.findMany({
      where: { patientId },
      select: bookingSelect,
      orderBy: [{ date: 'desc' }, { heureDebut: 'desc' }],
    });
  }

  async cancelBooking(
    patientId: number,
    rdvId: number,
    baseUrl: string = env.appUrl
  ): Promise<void> {
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
        patient: { select: { prenom: true, user: { select: { email: true } } } },
        dossier: { select: { files: { select: { storedName: true } } } },
      },
    });
    if (!rdv || rdv.patientId !== patientId) {
      throw new ApiError('Rendez-vous introuvable', 'NOT_FOUND', 404);
    }
    if (this.hasAppointmentStarted(rdv.date, rdv.heureDebut)) {
      throw new ApiError(
        'Un rendez-vous commencé ou passé ne peut plus être annulé',
        'BOOKING_CANCELLATION_CLOSED',
        409
      );
    }
    await prisma.rdv.delete({ where: { id: rdvId } });
    await removeDossierFiles(rdv.dossier?.files.map((file) => file.storedName) ?? []);

    if (rdv.patient?.user?.email) {
      const data = this.bookingEmailData(rdv, rdv.patient.prenom, `${baseUrl}/prendre-rendez-vous`);
      const mail = bookingCancellationEmail(data);
      void sendMail({
        to: rdv.patient.user.email,
        ...mail,
        attachments: logoAttachment(),
      });
    }
  }

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
    const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
    return {
      prenom,
      modaliteLabel: modaliteLabel(booking.modalite),
      dateLabel: capitalize(
        booking.date.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
      ),
      timeLabel: `${fromMinutes(timeDateToMinutes(booking.heureDebut))} - ${fromMinutes(
        timeDateToMinutes(booking.heureFin)
      )}`,
      siteLabel: booking.site ? `${booking.site.nom} - ${booking.site.ville}` : '-',
      medecinLabel: booking.medecin ? `Dr ${booking.medecin.prenom} ${booking.medecin.nom}` : '-',
      link,
    };
  }

  private hasAppointmentStarted(date: Date, startTime: Date, now = new Date()): boolean {
    const appointmentDate = utcDateKey(date);
    const today = parisDateKey(now);
    if (appointmentDate !== today) {
      return appointmentDate < today;
    }
    return timeDateToMinutes(startTime) <= parisTimeMinutes(now);
  }
}

export const rdvService = new RdvService();
