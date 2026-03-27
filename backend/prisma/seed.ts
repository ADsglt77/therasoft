import { PrismaClient, Role, Sexe, ModaliteType, Vacation, Rdv } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import path from 'path';

const rootEnv = path.resolve(process.cwd(), '..', '.env');
dotenv.config({ path: rootEnv });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL manquant. Définissez-le dans le .env à la racine du projet.');
  process.exit(1);
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

function toUtcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toUtcMidnightDateFromYmd(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function isWeekendUtc(date: Date): boolean {
  const dow = date.getUTCDay();
  return dow === 0 || dow === 6;
}

function withUtcTime(base: Date, hours: number, minutes: number): Date {
  const d = new Date(base);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

// Source unique de vérité pour le type de RDV (icône Lucide + libellé)
const RDV_TYPE_META: Record<ModaliteType, { typeIcon: string; typeDescription: string }> = {
  [ModaliteType.XRAY]: { typeIcon: 'image', typeDescription: 'Radiographie' },
  [ModaliteType.CT]: { typeIcon: 'file-text', typeDescription: 'Scanner (CT)' },
  [ModaliteType.MRI]: { typeIcon: 'clipboard-check', typeDescription: 'IRM' },
  [ModaliteType.US]: { typeIcon: 'mic', typeDescription: 'Échographie (US)' },
  [ModaliteType.MAMMO]: { typeIcon: 'heart', typeDescription: 'Mammographie' },
  [ModaliteType.PET]: { typeIcon: 'sparkles', typeDescription: 'TEP (PET)' },
  [ModaliteType.OTHER]: { typeIcon: 'info', typeDescription: 'Autre' },
};

async function main() {
  await waitForDatabase();

  console.log('🌱 Seed forcé : reset complet puis recréation des données...\n');

  console.log('🧹 Nettoyage de la base de données...');
  await prisma.dossier.deleteMany();
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
  // Générer en UTC pour éviter les décalages de date (UTC vs locale)
  const startDate = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(2026, 11, 31, 0, 0, 0, 0));

  let totalDays = 0;
  for (let date = new Date(startDate); date <= endDate; date = new Date(date.getTime() + 24 * 60 * 60 * 1000)) {
    const dayOfWeek = date.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends (UTC)

    totalDays++;
    const currentDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
    
    // 2-4 vacations par jour par médecin
    const vacationsPerMedecin = Math.floor(Math.random() * 3) + 2;
    
    for (const medecin of medecinsActifs) {
      const shuffledHoraires = [...horaires].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < vacationsPerMedecin && i < shuffledHoraires.length; i++) {
        const [hours, minutes] = shuffledHoraires[i].split(':');
        const horaire = withUtcTime(currentDate, parseInt(hours), parseInt(minutes));

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
    const key = `${toUtcDateKey(vacation.date)}_${vacation.medecinId}`;
    if (!vacationsByDateAndMedecin.has(key)) {
      vacationsByDateAndMedecin.set(key, []);
    }
    vacationsByDateAndMedecin.get(key)!.push(vacation);
  }

  let rdvCount = 0;
  for (const [key, dayVacations] of vacationsByDateAndMedecin.entries()) {
    const [dateStr] = key.split('_');
    const date = toUtcMidnightDateFromYmd(dateStr);

    // Garde-fou: ne jamais créer de RDV le week-end (cohérent UTC)
    if (isWeekendUtc(date)) {
      continue;
    }
    
    // Générer 5-10 rdv par jour où il y a des vacations
    const rdvsPerDay = Math.floor(Math.random() * 6) + 5;
    const shuffledPatients = [...createdPatients].sort(() => Math.random() - 0.5);
    const shuffledHoraires = [...rdvHoraires].sort(() => Math.random() - 0.5);

    for (let i = 0; i < rdvsPerDay && i < shuffledPatients.length && i < shuffledHoraires.length; i++) {
      const patient = shuffledPatients[i % shuffledPatients.length];
      const [hours, minutes] = shuffledHoraires[i].split(':');
      
      // Créer heureDebut et heureFin (durée variable: 20-45 minutes)
      const heureDebut = withUtcTime(date, parseInt(hours), parseInt(minutes));
      
      const dureeMinutes = [20, 30, 45][Math.floor(Math.random() * 3)];
      const heureFin = new Date(heureDebut);
      heureFin.setUTCMinutes(heureFin.getUTCMinutes() + dureeMinutes);

      // Utiliser une modalité aléatoire (sera liée à une vacation compatible plus tard)
      const modalite = modalites[Math.floor(Math.random() * modalites.length)];
      const rdv = await prisma.rdv.create({
        data: {
          date,
          heureDebut,
          heureFin,
          modalite: modalite,
          typeIcon: RDV_TYPE_META[modalite].typeIcon,
          typeDescription: RDV_TYPE_META[modalite].typeDescription,
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
    const key = `${toUtcDateKey(vacation.date)}_${vacation.modalite}`;
    if (!vacationsByDateAndModalite.has(key)) {
      vacationsByDateAndModalite.set(key, []);
    }
    vacationsByDateAndModalite.get(key)!.push(vacation);
  }
  
  for (const rdv of rdvs) {
    const dateKey = toUtcDateKey(rdv.date);
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

  console.log('📁 Création des dossiers médicaux pour chaque RDV...');
  let dossierCount = 0;
  
  // Templates d'observations et résultats selon la modalité
  const observationsTemplates: Record<ModaliteType, string[]> = {
    [ModaliteType.XRAY]: [
      'Examen radiographique standard réalisé sans injection de produit de contraste.',
      'Clichés réalisés en incidence antéro-postérieure et latérale.',
      'Examen réalisé selon les protocoles standards de radiologie conventionnelle.',
    ],
    [ModaliteType.CT]: [
      'Scanner réalisé avec injection de produit de contraste iodé.',
      'Acquisition volumique en coupes fines avec reconstruction multiplanaire.',
      'Examen réalisé selon le protocole standard avec injection de contraste.',
    ],
    [ModaliteType.MRI]: [
      'IRM réalisée avec séquences T1, T2 et FLAIR.',
      'Examen réalisé sans injection de gadolinium.',
      'IRM avec injection de produit de contraste pour étude de la rehaussement.',
    ],
    [ModaliteType.US]: [
      'Échographie réalisée avec sonde haute fréquence.',
      'Examen échographique doppler couleur réalisé.',
      'Échographie avec mesure des flux vasculaires.',
    ],
    [ModaliteType.MAMMO]: [
      'Mammographie réalisée en incidence cranio-caudale et oblique médio-latérale.',
      'Examen de dépistage réalisé selon les recommandations en vigueur.',
      'Mammographie avec compression optimale des tissus.',
    ],
    [ModaliteType.PET]: [
      'TEP réalisée avec injection de FDG.',
      'Examen TEP-TDM avec fusion d\'images.',
      'TEP réalisée selon le protocole standard oncologique.',
    ],
    [ModaliteType.OTHER]: [
      'Examen réalisé selon le protocole standard.',
      'Examen complémentaire réalisé.',
    ],
  };

  const resultatsTemplates: Record<ModaliteType, string[]> = {
    [ModaliteType.XRAY]: [
      'Pas d\'anomalie osseuse ou articulaire décelée. Structures anatomiques normales.',
      'Opacités pulmonaires discrètes sans signe de complication.',
      'Alignement osseux correct. Pas de signe de fracture ou de lésion.',
    ],
    [ModaliteType.CT]: [
      'Pas de lésion focale décelée. Structures anatomiques normales.',
      'Contraste normal des structures vasculaires. Pas d\'anomalie de rehaussement.',
      'Pas de collection ou d\'épanchement anormal.',
    ],
    [ModaliteType.MRI]: [
      'Signal normal des structures anatomiques. Pas de lésion focale décelée.',
      'Pas d\'anomalie de signal ou de rehaussement pathologique.',
      'Structures anatomiques normales sans signe de pathologie.',
    ],
    [ModaliteType.US]: [
      'Échogénicité normale des structures examinées.',
      'Flux vasculaires normaux sans signe de sténose ou de thrombose.',
      'Pas d\'anomalie morphologique ou structurelle décelée.',
    ],
    [ModaliteType.MAMMO]: [
      'Pas d\'opacité suspecte décelée. Densité mammaire normale.',
      'Pas de microcalcifications suspectes. Examen normal.',
      'Structures mammaires normales sans signe de pathologie.',
    ],
    [ModaliteType.PET]: [
      'Métabolisme normal sans hyperfixation pathologique.',
      'Pas de lésion hypermétabolique décelée.',
      'Distribution normale du traceur sans anomalie focale.',
    ],
    [ModaliteType.OTHER]: [
      'Examen normal sans anomalie décelée.',
      'Résultats dans les limites de la normale.',
    ],
  };

  const documentsTemplates = [
    'images/rdv_{rdvId}/image_001.dcm',
    'images/rdv_{rdvId}/image_002.dcm',
    'images/rdv_{rdvId}/series_001/',
    'reports/rdv_{rdvId}/rapport_medical.pdf',
  ];

  for (const rdv of rdvs) {
    // Sélectionner aléatoirement une observation et un résultat selon la modalité
    const observationsList = observationsTemplates[rdv.modalite] || observationsTemplates[ModaliteType.OTHER];
    const resultatsList = resultatsTemplates[rdv.modalite] || resultatsTemplates[ModaliteType.OTHER];
    
    const observation = observationsList[Math.floor(Math.random() * observationsList.length)];
    const resultat = resultatsList[Math.floor(Math.random() * resultatsList.length)];
    
    // Générer 1-3 documents aléatoirement
    const numDocuments = Math.floor(Math.random() * 3) + 1;
    const documents = Array.from({ length: numDocuments }, () => {
      const template = documentsTemplates[Math.floor(Math.random() * documentsTemplates.length)];
      return template.replace('{rdvId}', rdv.id.toString());
    }).join(', ');

    try {
      await prisma.dossier.create({
        data: {
          patientId: rdv.patientId,
          rdvId: rdv.id,
          observations: observation,
          resultats: resultat,
          documents: documents,
        },
      });
      dossierCount++;
    } catch (error) {
      // Ignorer les erreurs (doublons possibles si contrainte unique)
    }

    if (dossierCount % 500 === 0 && dossierCount > 0) {
      console.log(`   Progression: ${dossierCount} dossiers créés...`);
    }
  }
  console.log(`✅ ${dossierCount} dossiers médicaux créés\n`);

  console.log('✨ Seed terminé avec succès !\n');
  console.log('📊 Résumé:');
  console.log(`   - ${3} médecins (1 admin, 2 médecins actifs)`);
  console.log(`   - ${createdPatients.length} patients`);
  console.log(`   - ${vacations.length} vacations (année 2026 complète)`);
  console.log(`   - ${rdvs.length} rendez-vous`);
  console.log(`   - ${modaliteCount} liens Modalite (${Math.round(modaliteCount / rdvs.length * 100)}% des rdv liés)`);
  console.log(`   - ${dossierCount} dossiers médicaux (${Math.round(dossierCount / rdvs.length * 100)}% des rdv avec dossier)\n`);
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
