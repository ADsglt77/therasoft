import { ModaliteType } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../middlewares/errorHandler';
import { CreateBookingInput } from '../schemas/rdv.schemas';

interface OpeningHour {
  day: number; // 1 = lundi … 7 = dimanche
  open: string; // "HH:mm"
  close: string; // "HH:mm"
}

const DEFAULT_DURATION_MIN = 30;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
/** Time(0) stocké en UTC → minutes depuis minuit. */
function timeDateToMinutes(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
/** "HH:mm" → Date Time(0) (UTC 1970-01-01). */
function timeStrToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0, 0));
}
/** Jour ISO de la semaine (1 = lundi … 7 = dimanche) en UTC. */
function isoWeekdayUtc(date: Date): number {
  const d = date.getUTCDay();
  return d === 0 ? 7 : d;
}
function utcDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Distance à vol d'oiseau (km) entre deux points GPS (formule de haversine). */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

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

  async createBooking(patientId: number, input: CreateBookingInput): Promise<BookingResponse> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { medecinId: true },
    });
    if (!patient?.medecinId) {
      throw new ApiError('Aucun médecin rattaché à votre compte', 'BOOKING_NO_MEDECIN', 400);
    }

    // Re-vérification serveur : le créneau doit toujours être disponible.
    const slots = await this.getAvailableSlots(patientId, input.siteId, input.modalite, input.date);
    const slot = slots.find((s) => s.heureDebut === input.heureDebut);
    if (!slot) {
      throw new ApiError("Ce créneau n'est plus disponible", 'BOOKING_SLOT_UNAVAILABLE', 409);
    }

    return prisma.rdv.create({
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
  }

  async getMyBookings(patientId: number): Promise<BookingResponse[]> {
    return prisma.rdv.findMany({
      where: { patientId },
      select: bookingSelect,
      orderBy: [{ date: 'desc' }, { heureDebut: 'desc' }],
    });
  }

  async cancelBooking(patientId: number, rdvId: number): Promise<void> {
    const rdv = await prisma.rdv.findUnique({
      where: { id: rdvId },
      select: { id: true, patientId: true },
    });
    if (!rdv || rdv.patientId !== patientId) {
      throw new ApiError('Rendez-vous introuvable', 'NOT_FOUND', 404);
    }
    await prisma.rdv.delete({ where: { id: rdvId } });
  }
}

export const rdvService = new RdvService();
