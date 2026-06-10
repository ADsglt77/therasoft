import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../lib/prisma';
import { rdvService } from './rdv.service';
import { removeDossierFiles } from '../../../lib/dossier-storage';

vi.mock('../../../lib/dossier-storage', () => ({
  removeDossierFiles: vi.fn(),
}));

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(async (operation: unknown) => {
      if (typeof operation === 'function') {
        return operation(prisma);
      }
      return Promise.all(operation as Promise<unknown>[]);
    }),
    patient: { findUnique: vi.fn() },
    vacation: { findFirst: vi.fn() },
    site: { findUnique: vi.fn() },
    modaliteConfig: { findUnique: vi.fn() },
    rdv: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  },
}));

const date = new Date(Date.UTC(2099, 5, 12));
const isoWd = ((d) => (d === 0 ? 7 : d))(date.getUTCDay());

function mockContext({
  medecinId = 5,
  openingHours = [{ day: isoWd, open: '08:00', close: '09:00' }],
  duration = 30,
  busy = [] as { heureDebut: Date; heureFin: Date }[],
} = {}) {
  vi.mocked(prisma.patient.findUnique).mockResolvedValue({
    medecinId,
    medecin: { isActive: true },
    prenom: 'Test',
    user: { email: 'patient@test.fr', emailVerified: true },
  } as never);
  vi.mocked(prisma.vacation.findFirst).mockResolvedValue({ id: 1 } as never);
  vi.mocked(prisma.site.findUnique).mockResolvedValue({ openingHours } as never);
  vi.mocked(prisma.modaliteConfig.findUnique).mockResolvedValue({
    dureeMinutes: duration,
  } as never);
  vi.mocked(prisma.rdv.findMany).mockResolvedValue(busy as never);
}

describe('RdvService.getAvailableSlots', () => {
  beforeEach(() => vi.clearAllMocks());

  it('découpe les horaires du site selon la durée de la modalité', async () => {
    mockContext({ duration: 30 });
    const slots = await rdvService.getAvailableSlots(1, 2, 'MRI' as never, date);
    expect(slots).toEqual([
      { heureDebut: '08:00', heureFin: '08:30' },
      { heureDebut: '08:30', heureFin: '09:00' },
    ]);
  });

  it('exclut les créneaux chevauchant un RDV existant', async () => {
    const busy = [
      {
        heureDebut: new Date(Date.UTC(1970, 0, 1, 8, 0)),
        heureFin: new Date(Date.UTC(1970, 0, 1, 8, 30)),
      },
    ];
    mockContext({ duration: 30, busy });
    const slots = await rdvService.getAvailableSlots(1, 2, 'MRI' as never, date);
    expect(slots).toEqual([{ heureDebut: '08:30', heureFin: '09:00' }]);
  });

  it('retourne [] sans vacation au lieu ce jour', async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      medecinId: 5,
      medecin: { isActive: true },
    } as never);
    vi.mocked(prisma.vacation.findFirst).mockResolvedValue(null);
    expect(await rdvService.getAvailableSlots(1, 2, 'MRI' as never, date)).toEqual([]);
  });

  it('exige une vacation de la modalite demandee', async () => {
    mockContext();
    await rdvService.getAvailableSlots(1, 2, 'MRI' as never, date);
    expect(prisma.vacation.findFirst).toHaveBeenCalledWith({
      where: { medecinId: 5, siteId: 2, modalite: 'MRI', date },
      select: { id: true },
    });
  });
});

describe('RdvService.createBooking / cancel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('crée le RDV si le créneau est disponible (médecin + site + dossier vide)', async () => {
    mockContext({ duration: 30 });
    vi.mocked(prisma.rdv.create).mockResolvedValue({
      id: 99,
      date,
      heureDebut: new Date(Date.UTC(1970, 0, 1, 8, 0)),
      heureFin: new Date(Date.UTC(1970, 0, 1, 8, 30)),
      modalite: 'MRI',
      motif: null,
      site: { id: 2, nom: 'Centre', ville: 'Paris' },
      medecin: { id: 5, nom: 'Doe', prenom: 'John' },
    } as never);
    await rdvService.createBooking(7, {
      siteId: 2,
      date,
      heureDebut: '08:00',
      modalite: 'MRI',
    } as never);
    const arg = vi.mocked(prisma.rdv.create).mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.medecinId).toBe(5);
    expect(arg.data.siteId).toBe(2);
    expect(arg.data.modalite).toBe('MRI');
    expect(arg.data.dossier).toEqual({ create: {} });
  });

  it('refuse un créneau indisponible', async () => {
    mockContext({ duration: 30 });
    await expect(
      rdvService.createBooking(7, {
        siteId: 2,
        date,
        heureDebut: '12:00',
        modalite: 'MRI',
      } as never)
    ).rejects.toMatchObject({ code: 'BOOKING_SLOT_UNAVAILABLE' });
  });

  it("empêche d'annuler le RDV d'un autre patient", async () => {
    vi.mocked(prisma.rdv.findUnique).mockResolvedValueOnce({ id: 3, patientId: 999 } as never);
    await expect(rdvService.cancelBooking(7, 3)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it("empêche d'annuler un rendez-vous passé", async () => {
    vi.mocked(prisma.rdv.findUnique).mockResolvedValueOnce({
      id: 3,
      patientId: 7,
      date: new Date('2000-01-01T00:00:00.000Z'),
      heureDebut: new Date('1970-01-01T08:00:00.000Z'),
      dossier: { files: [] },
    } as never);

    await expect(rdvService.cancelBooking(7, 3)).rejects.toMatchObject({
      code: 'BOOKING_CANCELLATION_CLOSED',
    });
    expect(prisma.rdv.delete).not.toHaveBeenCalled();
  });

  it('supprime les fichiers physiques avec un rendez-vous futur annulé', async () => {
    vi.mocked(prisma.rdv.findUnique).mockResolvedValueOnce({
      id: 3,
      patientId: 7,
      date: new Date('2099-01-01T00:00:00.000Z'),
      heureDebut: new Date('1970-01-01T08:00:00.000Z'),
      heureFin: new Date('1970-01-01T08:30:00.000Z'),
      modalite: 'MRI',
      site: null,
      medecin: null,
      patient: { prenom: 'Test', user: null },
      dossier: { files: [{ storedName: 'file-a.pdf' }] },
    } as never);

    await rdvService.cancelBooking(7, 3);

    expect(prisma.rdv.delete).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(removeDossierFiles).toHaveBeenCalledWith(['file-a.pdf']);
  });
});
