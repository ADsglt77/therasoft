import { PrismaClient, Role, Sexe, ModaliteType, Vacation, Rdv } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import { resolve } from 'path';

if (!process.env.DATABASE_URL) {
  const envPath = resolve(__dirname, '..', '..', '.env');
  dotenv.config({ path: envPath });
}

let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL non défini');
  console.error('   Vérifiez que la variable d\'environnement DATABASE_URL est définie');
  console.error('   Ou qu\'un fichier .env existe avec DATABASE_URL');
  process.exit(1);
}

if (databaseUrl.includes('@db:') && !process.env.DATABASE_URL?.includes('@db:')) {
  databaseUrl = databaseUrl.replace('@db:', '@localhost:');
}

console.log(`🔌 Connexion à la base de données...`);
console.log(`   URL: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function waitForDatabase(maxRetries = 10, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Base de données connectée\n');
      return;
    } catch (error) {
      if (i < maxRetries - 1) {
        console.log(`⏳ Attente de la base de données... (${i + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new Error(`Impossible de se connecter à la base de données après ${maxRetries} tentatives`);
      }
    }
  }
}

async function main() {
  await waitForDatabase();
  console.log('🌱 Début du seed...\n');

  console.log('🧹 Nettoyage de la base de données...');
  await prisma.modalite.deleteMany();
  await prisma.rdv.deleteMany();
  await prisma.vacation.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.medecin.deleteMany();
  console.log('✅ Base de données nettoyée\n');

  console.log('👨‍⚕️ Création des médecins...');
  const passwordHash = await argon2.hash('Azertyuiop1!');

  const medecin1 = await prisma.medecin.create({
    data: {
      nom: 'Admin',
      prenom: 'Admin',
      specialite: '',
      email: 'admin@admin.admin',
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const medecin2 = await prisma.medecin.create({
    data: {
      nom: 'User',
      prenom: 'Test',
      specialite: '',
      email: 'user@user.user',
      passwordHash,
      role: Role.MEDECIN,
      isActive: true,
    },
  });

  console.log(`✅ ${2} médecins créés\n`);

  console.log('👤 Création des patients...');
  const patients = [
    {
      nom: 'Lefebvre',
      prenom: 'Marie',
      dateNaissance: new Date('1985-03-15'),
      sexe: Sexe.F,
    },
    {
      nom: 'Moreau',
      prenom: 'Paul',
      dateNaissance: new Date('1978-07-22'),
      sexe: Sexe.M,
    },
    {
      nom: 'Petit',
      prenom: 'Julie',
      dateNaissance: new Date('1992-11-08'),
      sexe: Sexe.F,
    },
    {
      nom: 'Garcia',
      prenom: 'Lucas',
      dateNaissance: new Date('1980-05-30'),
      sexe: Sexe.M,
    },
    {
      nom: 'Roux',
      prenom: 'Emma',
      dateNaissance: new Date('1995-09-12'),
      sexe: Sexe.F,
    },
    {
      nom: 'Simon',
      prenom: 'Thomas',
      dateNaissance: new Date('1987-01-25'),
      sexe: Sexe.M,
    },
    {
      nom: 'Laurent',
      prenom: 'Camille',
      dateNaissance: new Date('1990-06-18'),
      sexe: Sexe.X,
    },
    {
      nom: 'Michel',
      prenom: 'Antoine',
      dateNaissance: new Date('1975-12-03'),
      sexe: Sexe.M,
    },
  ];

  const createdPatients = await Promise.all(
    patients.map((patient) => prisma.patient.create({ data: patient }))
  );
  console.log(`✅ ${createdPatients.length} patients créés\n`);

  console.log('📅 Création des vacations...');
  const villesAvecSites = [
    {
      ville: 'Paris',
      sites: ['Hôpital Pitié-Salpêtrière', 'Hôpital Necker', 'Clinique de la Porte de Saint-Cloud']
    },
    {
      ville: 'Lyon',
      sites: ['Hôpital Édouard Herriot', 'Centre Hospitalier Lyon Sud', 'Clinique du Val d\'Ouest']
    },
    {
      ville: 'Marseille',
      sites: ['Hôpital de la Timone', 'Hôpital Nord', 'Clinique Clairval']
    },
    {
      ville: 'Toulouse',
      sites: ['CHU Toulouse - Purpan', 'CHU Toulouse - Rangueil', 'Clinique Pasteur']
    },
    {
      ville: 'Nice',
      sites: ['CHU Nice - Hôpital Pasteur', 'Hôpital Lenval', 'Clinique Saint-Georges']
    },
    {
      ville: 'Nantes',
      sites: ['CHU Nantes - Hôtel-Dieu', 'CHU Nantes - Hôpital Nord', 'Clinique Jules Verne']
    },
    {
      ville: 'Strasbourg',
      sites: ['Hôpitaux Universitaires de Strasbourg', 'Clinique Sainte-Anne', 'Centre Paul Strauss']
    },
    {
      ville: 'Montpellier',
      sites: ['CHU Montpellier - Hôpital Lapeyronie', 'CHU Montpellier - Hôpital Gui de Chauliac', 'Clinique Clémentville']
    },
    {
      ville: 'Bordeaux',
      sites: ['CHU Bordeaux - Hôpital Pellegrin', 'CHU Bordeaux - Hôpital Haut-Lévêque', 'Clinique Tivoli']
    },
    {
      ville: 'Lille',
      sites: ['CHU Lille - Hôpital Claude Huriez', 'CHU Lille - Hôpital Roger Salengro', 'Clinique de la Louvière']
    }
  ];
  
  const modalites: ModaliteType[] = [ModaliteType.XRAY, ModaliteType.CT, ModaliteType.MRI, ModaliteType.US, ModaliteType.MAMMO];
  const medecins = [medecin1, medecin2];
  const horaires = ['08:00', '09:30', '11:00', '14:00', '15:30', '17:00'];

  const vacations: Vacation[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let day = 0; day < 30; day++) {
    const date = new Date(today);
    date.setDate(today.getDate() + day);

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const vacationsPerDay = Math.floor(Math.random() * 3) + 2;
    const shuffledMedecins = [...medecins].sort(() => Math.random() - 0.5);
    const shuffledHoraires = [...horaires].sort(() => Math.random() - 0.5);

    for (let i = 0; i < vacationsPerDay && i < shuffledMedecins.length && i < shuffledHoraires.length; i++) {
      const medecin = shuffledMedecins[i];
      const [hours, minutes] = shuffledHoraires[i].split(':');
      const horaire = new Date(date);
      horaire.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const villeAvecSites = villesAvecSites[Math.floor(Math.random() * villesAvecSites.length)];
      const site = villeAvecSites.sites[Math.floor(Math.random() * villeAvecSites.sites.length)];

      const vacation = await prisma.vacation.create({
        data: {
          date,
          horaire,
          ville: villeAvecSites.ville,
          site: site,
          modalite: modalites[Math.floor(Math.random() * modalites.length)],
          medecinId: medecin.id,
        },
      });
      vacations.push(vacation);
    }
  }
  console.log(`✅ ${vacations.length} vacations créées\n`);

  console.log('📋 Création des rendez-vous...');
  const rdvs: Rdv[] = [];
  const rdvHoraires = ['08:30', '10:00', '11:30', '14:30', '16:00'];

  for (let day = 0; day < 30; day++) {
    const date = new Date(today);
    date.setDate(today.getDate() + day);

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const rdvsPerDay = Math.floor(Math.random() * 4) + 3;
    const shuffledPatients = [...createdPatients].sort(() => Math.random() - 0.5);
    const shuffledHoraires = [...rdvHoraires].sort(() => Math.random() - 0.5);

    for (let i = 0; i < rdvsPerDay && i < shuffledPatients.length && i < shuffledHoraires.length; i++) {
      const patient = shuffledPatients[i];
      const [hours, minutes] = shuffledHoraires[i].split(':');
      const horaire = new Date(date);
      horaire.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const rdv = await prisma.rdv.create({
        data: {
          date,
          horaire,
          modalite: modalites[Math.floor(Math.random() * modalites.length)],
          patientId: patient.id,
        },
      });
      rdvs.push(rdv);
    }
  }
  console.log(`✅ ${rdvs.length} rendez-vous créés\n`);

  console.log('🔗 Création des liens Modalite...');
  let modaliteCount = 0;
  const rdvsToLink = rdvs.slice(0, Math.floor(rdvs.length * 0.6));
  
  for (const rdv of rdvsToLink) {
    const compatibleVacations = vacations.filter(
      (v) =>
        v.modalite === rdv.modalite &&
        v.date.toDateString() === rdv.date.toDateString() &&
        Math.abs(v.horaire.getTime() - rdv.horaire.getTime()) < 2 * 60 * 60 * 1000
    );

    if (compatibleVacations.length > 0) {
      const vacation = compatibleVacations[Math.floor(Math.random() * compatibleVacations.length)];
      
      try {
        await prisma.modalite.create({
          data: {
            rdvId: rdv.id,
            vacationId: vacation.id,
          },
        });
        modaliteCount++;
      } catch {
        // Ignorer les doublons
      }
    }
  }
  console.log(`✅ ${modaliteCount} liens Modalite créés\n`);

  console.log('✨ Seed terminé avec succès !\n');
  console.log('📊 Résumé:');
  console.log(`   - ${2} médecins`);
  console.log(`   - ${createdPatients.length} patients`);
  console.log(`   - ${vacations.length} vacations`);
  console.log(`   - ${rdvs.length} rendez-vous`);
  console.log(`   - ${modaliteCount} liens Modalite\n`);
  console.log('🔑 Identifiants:');
  console.log('   Email: user@user.user');
  console.log('   Password: Azertyuiop1!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    
    if (e.code === 'ECONNREFUSED') {
      console.error('\n💡 Vérifications:');
      console.error('   1. La base de données est-elle démarrée ?');
      console.error('   2. DATABASE_URL est-elle correctement configurée ?');
      console.error('   3. Dans Docker, vérifiez: docker compose ps db');
      console.error('   4. Attendez quelques secondes que la DB soit prête après le démarrage');
    } else if (e.code === 'P1001') {
      console.error('\n💡 La base de données n\'est pas accessible');
      console.error('   Vérifiez que le service db est démarré: docker compose ps');
    }
    
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

