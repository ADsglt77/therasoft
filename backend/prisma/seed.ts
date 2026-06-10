import { PrismaClient, Role, ModaliteType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL manquant. Lancez le seed via Docker : docker compose exec backend npm run prisma:seed');
  process.exit(1);
}

console.log('🔌 Connexion à la base de données...');
console.log(`   URL: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --- Données de démonstration (volontairement minimales) ---

/** Médecins de démonstration (les seuls comptes pré-créés). */
const MEDECINS = [
  { name: 'User Test', email: 'user@user.user', nom: 'User', prenom: 'Test', specialite: 'Radiologie' },
  { name: 'User2 Test', email: 'user2@user.user', nom: 'User2', prenom: 'Test', specialite: 'Imagerie médicale' },
];

/** Un site par ville. Horaires lun–ven 08:00–18:00. */
const STANDARD_HOURS = [1, 2, 3, 4, 5].map((day) => ({ day, open: '08:00', close: '18:00' }));
const SITES = [
  { nom: 'Centre d’imagerie de Limoges', ville: 'Limoges', adresse: 'Limoges', latitude: 45.8336, longitude: 1.2611 },
  { nom: 'Centre d’imagerie de Bordeaux', ville: 'Bordeaux', adresse: 'Bordeaux', latitude: 44.8378, longitude: -0.5792 },
  { nom: 'Centre d’imagerie de Lyon', ville: 'Lyon', adresse: 'Lyon', latitude: 45.764, longitude: 4.8357 },
  { nom: 'Centre d’imagerie de Marseille', ville: 'Marseille', adresse: 'Marseille', latitude: 43.2965, longitude: 5.3698 },
  { nom: 'Centre d’imagerie de Paris', ville: 'Paris', adresse: 'Paris', latitude: 48.8566, longitude: 2.3522 },
  { nom: 'Centre d’imagerie de Nantes', ville: 'Nantes', adresse: 'Nantes', latitude: 47.2184, longitude: -1.5536 },
  { nom: 'Centre d’imagerie de Toulouse', ville: 'Toulouse', adresse: 'Toulouse', latitude: 43.6047, longitude: 1.4442 },
];

/** Durée (minutes) d'un rendez-vous selon la modalité. */
const MODALITE_DUREES: Record<ModaliteType, number> = {
  [ModaliteType.XRAY]: 15,
  [ModaliteType.CT]: 20,
  [ModaliteType.MRI]: 30,
  [ModaliteType.US]: 20,
  [ModaliteType.MAMMO]: 15,
  [ModaliteType.PET]: 45,
  [ModaliteType.OTHER]: 30,
};
const MODALITES = Object.keys(MODALITE_DUREES) as ModaliteType[];

/** Fenêtre de génération des vacations : ~3 mois à partir du 1er du mois courant. */
const VACATION_DAYS = 90;

async function waitForDatabase(maxRetries = 10, delay = 2000): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Base de données connectée\n');
      return;
    } catch {
      if (i === maxRetries - 1) throw new Error(`Connexion impossible après ${maxRetries} tentatives`);
      console.log(`⏳ Attente de la base de données... (${i + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

function isWeekdayUtc(date: Date): boolean {
  const d = date.getUTCDay();
  return d >= 1 && d <= 5;
}

function withUtcTime(base: Date, hours: number, minutes: number): Date {
  const d = new Date(base);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

async function cleanDatabase(): Promise<void> {
  console.log('🧹 Nettoyage de la base de données...');
  await prisma.dossierFile.deleteMany();
  await prisma.dossier.deleteMany();
  await prisma.rdvVacation.deleteMany();
  await prisma.rdv.deleteMany();
  await prisma.vacation.deleteMany();
  await prisma.site.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.medecin.deleteMany();
  await prisma.user.deleteMany();
  await prisma.modaliteConfig.deleteMany();
  console.log('✅ Base de données nettoyée\n');
}

async function main(): Promise<void> {
  await waitForDatabase();

  const resetOnSeed = process.env.RESET_DB_ON_SEED === 'true';
  const existingMedecins = await prisma.medecin.count();

  // Seed idempotent : en production (reset désactivé), on ne touche pas à des données existantes.
  if (!resetOnSeed && existingMedecins > 0) {
    console.log('⏭️  Seed ignoré : médecins déjà présents et RESET_DB_ON_SEED=false.\n');
    return;
  }

  if (resetOnSeed) {
    console.log('🌱 Seed forcé (RESET_DB_ON_SEED=true) : reset complet puis recréation...\n');
    await cleanDatabase();
  } else {
    console.log('🌱 Base vide : initialisation des données de démonstration...\n');
  }

  // 1) Durées par modalité
  console.log('⏱️  Configuration des durées par modalité...');
  await Promise.all(
    MODALITES.map((modalite) =>
      prisma.modaliteConfig.create({ data: { modalite, dureeMinutes: MODALITE_DUREES[modalite] } })
    )
  );
  console.log('✅ Durées par modalité configurées\n');

  // 2) Sites (un par ville)
  console.log('🏥 Création des sites...');
  const sites = [];
  for (const s of SITES) {
    sites.push(
      await prisma.site.create({
        data: {
          nom: s.nom,
          ville: s.ville,
          adresse: s.adresse,
          latitude: s.latitude,
          longitude: s.longitude,
          openingHours: STANDARD_HOURS,
        },
      })
    );
  }
  console.log(`✅ ${sites.length} sites créés\n`);

  // 3) Médecins (compte Better Auth + profil)
  console.log('👨‍⚕️ Création des médecins...');
  const { hashPassword } = await import('better-auth/crypto');
  const passwordHash = await hashPassword('Azertyuiop1!');
  const now = new Date();

  const medecins = [];
  for (const m of MEDECINS) {
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: m.name,
        email: m.email,
        emailVerified: true,
        role: Role.MEDECIN,
        createdAt: now,
        updatedAt: now,
        accounts: {
          create: {
            id: crypto.randomUUID(),
            accountId: m.email,
            providerId: 'credential',
            password: passwordHash,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
    });
    medecins.push(
      await prisma.medecin.create({
        data: { nom: m.nom, prenom: m.prenom, specialite: m.specialite, userId: user.id, isActive: true },
      })
    );
  }
  console.log(`✅ ${medecins.length} médecins créés\n`);

  // 4) Vacations : 1 par médecin et par jour ouvré, site tournant chaque semaine.
  console.log('📅 Création des vacations (jours ouvrés, site tournant par semaine)...');
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  let vacationCount = 0;

  for (let i = 0; i < VACATION_DAYS; i++) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i, 0, 0, 0, 0));
    if (!isWeekdayUtc(date)) continue;

    const weekIndex = Math.floor(i / 7);
    for (let m = 0; m < medecins.length; m++) {
      const site = sites[(weekIndex + m) % sites.length];
      const modalite = MODALITES[(i + m) % MODALITES.length];
      await prisma.vacation.create({
        data: {
          date,
          horaire: withUtcTime(date, 8, 0),
          siteId: site.id,
          modalite,
          medecinId: medecins[m].id,
        },
      });
      vacationCount++;
    }
  }
  console.log(`✅ ${vacationCount} vacations créées\n`);

  console.log('✨ Seed terminé avec succès !\n');
  console.log('📊 Résumé :');
  console.log(`   - ${medecins.length} médecins (aucun patient pré-créé)`);
  console.log(`   - ${sites.length} sites`);
  console.log(`   - ${vacationCount} vacations`);
  console.log('🔑 Identifiants médecins (mot de passe : Azertyuiop1!) :');
  MEDECINS.forEach((m) => console.log(`   - ${m.email}`));
  console.log('   Les patients s’inscrivent eux-mêmes via /register.\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
