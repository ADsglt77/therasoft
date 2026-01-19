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
      specialite: 'Radiologie',
      email: 'user@user.user',
      passwordHash,
      role: Role.MEDECIN,
      isActive: true,
    },
  });

  const medecin3 = await prisma.medecin.create({
    data: {
      nom: 'User2',
      prenom: 'Test',
      specialite: 'Imagerie médicale',
      email: 'user2@user.user',
      passwordHash,
      role: Role.MEDECIN,
      isActive: true,
    },
  });

  console.log(`✅ ${3} médecins créés\n`);

  console.log('👤 Création des patients...');
  const patients = [
    { nom: 'Lefebvre', prenom: 'Marie', dateNaissance: new Date('1985-03-15'), sexe: Sexe.F },
    { nom: 'Moreau', prenom: 'Paul', dateNaissance: new Date('1978-07-22'), sexe: Sexe.M },
    { nom: 'Petit', prenom: 'Julie', dateNaissance: new Date('1992-11-08'), sexe: Sexe.F },
    { nom: 'Garcia', prenom: 'Lucas', dateNaissance: new Date('1980-05-30'), sexe: Sexe.M },
    { nom: 'Roux', prenom: 'Emma', dateNaissance: new Date('1995-09-12'), sexe: Sexe.F },
    { nom: 'Simon', prenom: 'Thomas', dateNaissance: new Date('1987-01-25'), sexe: Sexe.M },
    { nom: 'Laurent', prenom: 'Camille', dateNaissance: new Date('1990-06-18'), sexe: Sexe.X },
    { nom: 'Michel', prenom: 'Antoine', dateNaissance: new Date('1975-12-03'), sexe: Sexe.M },
    { nom: 'Bernard', prenom: 'Sophie', dateNaissance: new Date('1988-04-20'), sexe: Sexe.F },
    { nom: 'Dubois', prenom: 'Pierre', dateNaissance: new Date('1982-09-14'), sexe: Sexe.M },
    { nom: 'Leroy', prenom: 'Claire', dateNaissance: new Date('1993-12-05'), sexe: Sexe.F },
    { nom: 'Morel', prenom: 'David', dateNaissance: new Date('1979-06-28'), sexe: Sexe.M },
    { nom: 'Girard', prenom: 'Isabelle', dateNaissance: new Date('1986-02-11'), sexe: Sexe.F },
    { nom: 'Bonnet', prenom: 'Nicolas', dateNaissance: new Date('1984-08-23'), sexe: Sexe.M },
    { nom: 'Dupont', prenom: 'Amélie', dateNaissance: new Date('1991-10-07'), sexe: Sexe.F },
    { nom: 'Lambert', prenom: 'Julien', dateNaissance: new Date('1983-05-19'), sexe: Sexe.M },
    { nom: 'Martin', prenom: 'Céline', dateNaissance: new Date('1989-07-30'), sexe: Sexe.F },
    { nom: 'Robert', prenom: 'François', dateNaissance: new Date('1977-11-16'), sexe: Sexe.M },
    { nom: 'Richard', prenom: 'Valérie', dateNaissance: new Date('1994-03-22'), sexe: Sexe.F },
    { nom: 'Petit', prenom: 'Marc', dateNaissance: new Date('1981-01-08'), sexe: Sexe.M },
    { nom: 'Durand', prenom: 'Nathalie', dateNaissance: new Date('1987-09-13'), sexe: Sexe.F },
    { nom: 'Leroy', prenom: 'Sébastien', dateNaissance: new Date('1985-12-25'), sexe: Sexe.M },
    { nom: 'Moreau', prenom: 'Caroline', dateNaissance: new Date('1990-04-17'), sexe: Sexe.F },
    { nom: 'Simon', prenom: 'Olivier', dateNaissance: new Date('1976-08-04'), sexe: Sexe.M },
    { nom: 'Laurent', prenom: 'Patricia', dateNaissance: new Date('1988-06-21'), sexe: Sexe.F },
    { nom: 'Lefebvre', prenom: 'Stéphane', dateNaissance: new Date('1982-02-14'), sexe: Sexe.M },
    { nom: 'Michel', prenom: 'Véronique', dateNaissance: new Date('1992-10-29'), sexe: Sexe.F },
    { nom: 'Garcia', prenom: 'Romain', dateNaissance: new Date('1984-07-06'), sexe: Sexe.M },
    { nom: 'David', prenom: 'Sandrine', dateNaissance: new Date('1989-05-12'), sexe: Sexe.F },
    { nom: 'Bertrand', prenom: 'Guillaume', dateNaissance: new Date('1983-11-18'), sexe: Sexe.M },
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
  // Seulement les médecins (pas admin)
  const medecinsActifs = [medecin2, medecin3];
  const horaires = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  console.log('📅 Création des vacations pour toute l\'année 2026...');
  const vacations: Vacation[] = [];
  const startDate = new Date('2026-01-01');
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date('2026-12-31');
  endDate.setHours(23, 59, 59, 999);

  let totalDays = 0;
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
    
    totalDays++;
    const currentDate = new Date(date);
    
    // 2-4 vacations par jour par médecin
    const vacationsPerMedecin = Math.floor(Math.random() * 3) + 2;
    
    for (const medecin of medecinsActifs) {
      const shuffledHoraires = [...horaires].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < vacationsPerMedecin && i < shuffledHoraires.length; i++) {
        const [hours, minutes] = shuffledHoraires[i].split(':');
        const horaire = new Date(currentDate);
        horaire.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const villeAvecSites = villesAvecSites[Math.floor(Math.random() * villesAvecSites.length)];
        const site = villeAvecSites.sites[Math.floor(Math.random() * villeAvecSites.sites.length)];

        const vacation = await prisma.vacation.create({
          data: {
            date: currentDate,
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
    
    // Afficher la progression tous les 50 jours
    if (totalDays % 50 === 0) {
      console.log(`   Progression: ${totalDays} jours traités, ${vacations.length} vacations créées...`);
    }
  }
  console.log(`✅ ${vacations.length} vacations créées pour ${totalDays} jours ouvrés\n`);

  console.log('📋 Création des rendez-vous pour chaque jour avec vacations...');
  const rdvs: Rdv[] = [];
  const rdvHoraires = ['08:15', '08:45', '09:15', '09:45', '10:15', '10:45', '11:15', '11:45', 
                       '13:15', '13:45', '14:15', '14:45', '15:15', '15:45', '16:15', '16:45', '17:15'];
  
  // Grouper les vacations par date et médecin
  const vacationsByDateAndMedecin = new Map<string, Vacation[]>();
  for (const vacation of vacations) {
    const key = `${vacation.date.toISOString().split('T')[0]}_${vacation.medecinId}`;
    if (!vacationsByDateAndMedecin.has(key)) {
      vacationsByDateAndMedecin.set(key, []);
    }
    vacationsByDateAndMedecin.get(key)!.push(vacation);
  }

  let rdvCount = 0;
  for (const [key, dayVacations] of vacationsByDateAndMedecin.entries()) {
    const [dateStr] = key.split('_');
    const date = new Date(dateStr + 'T00:00:00');
    
    // Générer 5-10 rdv par jour où il y a des vacations
    const rdvsPerDay = Math.floor(Math.random() * 6) + 5;
    const shuffledPatients = [...createdPatients].sort(() => Math.random() - 0.5);
    const shuffledHoraires = [...rdvHoraires].sort(() => Math.random() - 0.5);

    for (let i = 0; i < rdvsPerDay && i < shuffledPatients.length && i < shuffledHoraires.length; i++) {
      const patient = shuffledPatients[i % shuffledPatients.length];
      const [hours, minutes] = shuffledHoraires[i].split(':');
      
      // Créer heureDebut et heureFin (durée variable: 20-45 minutes)
      const heureDebut = new Date(date);
      heureDebut.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const dureeMinutes = [20, 30, 45][Math.floor(Math.random() * 3)];
      const heureFin = new Date(heureDebut);
      heureFin.setMinutes(heureFin.getMinutes() + dureeMinutes);

      // Utiliser une modalité aléatoire (sera liée à une vacation compatible plus tard)
      const rdv = await prisma.rdv.create({
        data: {
          date,
          heureDebut,
          heureFin,
          modalite: modalites[Math.floor(Math.random() * modalites.length)],
          patientId: patient.id,
        },
      });
      rdvs.push(rdv);
      rdvCount++;
    }
    
    if (rdvCount % 500 === 0) {
      console.log(`   Progression: ${rdvCount} rendez-vous créés...`);
    }
  }
  console.log(`✅ ${rdvs.length} rendez-vous créés\n`);

  console.log('🔗 Création des liens Modalite (liaison rdv <-> vacation)...');
  let modaliteCount = 0;
  
  // Grouper les vacations par date et modalité pour optimisation
  const vacationsByDateAndModalite = new Map<string, Vacation[]>();
  for (const vacation of vacations) {
    const key = `${vacation.date.toISOString().split('T')[0]}_${vacation.modalite}`;
    if (!vacationsByDateAndModalite.has(key)) {
      vacationsByDateAndModalite.set(key, []);
    }
    vacationsByDateAndModalite.get(key)!.push(vacation);
  }
  
  for (const rdv of rdvs) {
    const dateKey = rdv.date.toISOString().split('T')[0];
    const key = `${dateKey}_${rdv.modalite}`;
    const compatibleVacations = vacationsByDateAndModalite.get(key) || [];
    
    if (compatibleVacations.length > 0) {
      // Filtrer par proximité horaire (dans un créneau de 2h)
      const rdvStartMinutes = rdv.heureDebut.getHours() * 60 + rdv.heureDebut.getMinutes();
      
      const nearbyVacations = compatibleVacations.filter((v) => {
        const vMinutes = v.horaire.getHours() * 60 + v.horaire.getMinutes();
        const diffMinutes = Math.abs(vMinutes - rdvStartMinutes);
        return diffMinutes < 120; // 2 heures
      });
      
      if (nearbyVacations.length > 0) {
        // Prendre une vacation aléatoire parmi les compatibles
        const vacation = nearbyVacations[Math.floor(Math.random() * nearbyVacations.length)];
        
        try {
          await prisma.modalite.create({
            data: {
              rdvId: rdv.id,
              vacationId: vacation.id,
            },
          });
          modaliteCount++;
        } catch {
          // Ignorer les doublons (contrainte unique)
        }
      }
    }
    
    if (modaliteCount % 500 === 0 && modaliteCount > 0) {
      console.log(`   Progression: ${modaliteCount} liens créés...`);
    }
  }
  console.log(`✅ ${modaliteCount} liens Modalite créés\n`);

  console.log('✨ Seed terminé avec succès !\n');
  console.log('📊 Résumé:');
  console.log(`   - ${3} médecins (1 admin, 2 médecins actifs)`);
  console.log(`   - ${createdPatients.length} patients`);
  console.log(`   - ${vacations.length} vacations (année 2026 complète)`);
  console.log(`   - ${rdvs.length} rendez-vous`);
  console.log(`   - ${modaliteCount} liens Modalite (${Math.round(modaliteCount / rdvs.length * 100)}% des rdv liés)\n`);
  console.log('🔑 Identifiants:');
  console.log('   Médecin 1:');
  console.log('     Email: user@user.user');
  console.log('     Password: Azertyuiop1!');
  console.log('   Médecin 2:');
  console.log('     Email: user2@user.user');
  console.log('     Password: Azertyuiop1!\n');
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

