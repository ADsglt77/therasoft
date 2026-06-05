/**
 * Établissements réels (CHU / cliniques privées) pour le seed et l'onglet Site.
 * Coordonnées et adresses publiques — horaires indicatifs (accueil / imagerie).
 */

export interface OpeningHourSeed {
  day: number; // 1 = lundi … 7 = dimanche
  open: string;
  close: string;
}

export interface SiteSeed {
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  websiteUrl: string;
  openingHours: OpeningHourSeed[];
}

export interface VilleSitesSeed {
  ville: string;
  sites: SiteSeed[];
}

/** Horaires type CHU : lun–ven 7h–20h, sam 8h–13h */
const horairesChu: OpeningHourSeed[] = [
  { day: 1, open: '07:00', close: '20:00' },
  { day: 2, open: '07:00', close: '20:00' },
  { day: 3, open: '07:00', close: '20:00' },
  { day: 4, open: '07:00', close: '20:00' },
  { day: 5, open: '07:00', close: '20:00' },
  { day: 6, open: '08:00', close: '13:00' },
];

/** Horaires type clinique privée : lun–ven 8h–19h */
const horairesClinique: OpeningHourSeed[] = [
  { day: 1, open: '08:00', close: '19:00' },
  { day: 2, open: '08:00', close: '19:00' },
  { day: 3, open: '08:00', close: '19:00' },
  { day: 4, open: '08:00', close: '19:00' },
  { day: 5, open: '08:00', close: '19:00' },
];

export const SEED_SITES_BY_CITY: VilleSitesSeed[] = [
  {
    ville: 'Paris',
    sites: [
      {
        nom: 'Hôpital Pitié-Salpêtrière (AP-HP)',
        adresse: '47-83 boulevard de l\'Hôpital, 75013 Paris',
        latitude: 48.8362,
        longitude: 2.3644,
        websiteUrl: 'https://www.aphp.fr/lhopital-pitie-salpetriere',
        openingHours: horairesChu,
      },
      {
        nom: 'Hôpital Necker-Enfants malades (AP-HP)',
        adresse: '149 rue de Sèvres, 75015 Paris',
        latitude: 48.8467,
        longitude: 2.3142,
        websiteUrl: 'https://www.aphp.fr/hopital-necker-enfants-malades',
        openingHours: horairesChu,
      },
      {
        nom: 'Institut Mutualiste Montsouris',
        adresse: '42 boulevard Jourdan, 75014 Paris',
        latitude: 48.8224,
        longitude: 2.3361,
        websiteUrl: 'https://www.montsouris.fr',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Lyon',
    sites: [
      {
        nom: 'Hôpital Édouard Herriot (HCL)',
        adresse: '5 place d\'Arsonval, 69003 Lyon',
        latitude: 45.741,
        longitude: 4.882,
        websiteUrl: 'https://www.chu-lyon.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Hôpital Lyon Sud (HCL)',
        adresse: 'Chemin du Grand Revoyet, 69310 Pierre-Bénite',
        latitude: 45.6967,
        longitude: 4.8269,
        websiteUrl: 'https://www.chu-lyon.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Clinique du Val d\'Ouest',
        adresse: '43 route de Vourles, 69230 Saint-Genis-Laval',
        latitude: 45.6753,
        longitude: 4.7931,
        websiteUrl: 'https://www.clinique-valdouest.fr',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Marseille',
    sites: [
      {
        nom: 'Hôpital de la Timone (AP-HM)',
        adresse: '264 rue Saint-Pierre, 13005 Marseille',
        latitude: 43.2936,
        longitude: 5.3958,
        websiteUrl: 'https://www.ap-hm.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Hôpital Nord (AP-HM)',
        adresse: 'Chemin des Bourrelys, 13915 Marseille',
        latitude: 43.3444,
        longitude: 5.4347,
        websiteUrl: 'https://www.ap-hm.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Clinique Clairval',
        adresse: '317 boulevard du Redon, 13009 Marseille',
        latitude: 43.2522,
        longitude: 5.4194,
        websiteUrl: 'https://www.clinique-clairval.fr',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Toulouse',
    sites: [
      {
        nom: 'CHU Purpan',
        adresse: 'Place du Dr Baylac, 31300 Toulouse',
        latitude: 43.6089,
        longitude: 1.4336,
        websiteUrl: 'https://www.chu-toulouse.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'CHU Rangueil',
        adresse: '1 avenue du Professeur Jean Poulhès, 31400 Toulouse',
        latitude: 43.5556,
        longitude: 1.4969,
        websiteUrl: 'https://www.chu-toulouse.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Clinique Pasteur',
        adresse: '45 avenue de Lombez, 31300 Toulouse',
        latitude: 43.5986,
        longitude: 1.4186,
        websiteUrl: 'https://www.clinique-pasteur.com',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Nice',
    sites: [
      {
        nom: 'CHU Pasteur 2',
        adresse: '30 voie Romaine, 06000 Nice',
        latitude: 43.7189,
        longitude: 7.2769,
        websiteUrl: 'https://www.chu-nice.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Hôpital l\'Archet 2 (CHU Nice)',
        adresse: '151 route de Saint-Antoine de Ginestière, 06200 Nice',
        latitude: 43.6819,
        longitude: 7.2289,
        websiteUrl: 'https://www.chu-nice.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Clinique Saint-George',
        adresse: '3 avenue de Rimiez, 06100 Nice',
        latitude: 43.7181,
        longitude: 7.2528,
        websiteUrl: 'https://www.clinique-saint-george.com',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Nantes',
    sites: [
      {
        nom: 'CHU Hôtel-Dieu',
        adresse: '1 place Alexis-Ricordeau, 44093 Nantes',
        latitude: 47.2136,
        longitude: -1.5519,
        websiteUrl: 'https://www.chu-nantes.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Hôpital Nord Laennec (CHU de Nantes)',
        adresse: 'Boulevard Jacques Monod, 44093 Saint-Herblain',
        latitude: 47.2542,
        longitude: -1.6218,
        websiteUrl: 'https://www.chu-nantes.fr/hopital-nord-laennec',
        openingHours: horairesChu,
      },
      {
        nom: 'Clinique Jules Verne',
        adresse: '2 rue Jules Verne, 44700 Orvault',
        latitude: 47.2597,
        longitude: -1.6214,
        websiteUrl: 'https://www.clinique-jules-verne.fr',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Strasbourg',
    sites: [
      {
        nom: 'Nouvel Hôpital Civil',
        adresse: '1 place de l\'Hôpital, 67091 Strasbourg',
        latitude: 48.5836,
        longitude: 7.7447,
        websiteUrl: 'https://www.chru-strasbourg.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Hôpital Hautepierre',
        adresse: '1 avenue Molière, 67200 Strasbourg',
        latitude: 48.5619,
        longitude: 7.6978,
        websiteUrl: 'https://www.chru-strasbourg.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Clinique Sainte-Anne',
        adresse: '6 rue Boecklin, 67000 Strasbourg',
        latitude: 48.5722,
        longitude: 7.7694,
        websiteUrl: 'https://www.clinique-sainte-anne.com',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Montpellier',
    sites: [
      {
        nom: 'Hôpital Lapeyronie (CHU)',
        adresse: '371 avenue du Doyen Gaston Giraud, 34295 Montpellier',
        latitude: 43.6169,
        longitude: 3.8492,
        websiteUrl: 'https://www.chu-montpellier.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Hôpital Gui de Chauliac (CHU)',
        adresse: '80 avenue Augustin Fliche, 34295 Montpellier',
        latitude: 43.6322,
        longitude: 3.8681,
        websiteUrl: 'https://www.chu-montpellier.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Clinique Clémentville',
        adresse: '4 avenue de Lodève, 34070 Montpellier',
        latitude: 43.6083,
        longitude: 3.8786,
        websiteUrl: 'https://www.clinique-clementville.com',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Bordeaux',
    sites: [
      {
        nom: 'Hôpital Pellegrin (CHU)',
        adresse: 'Place Amélie Raba Léon, 33076 Bordeaux',
        latitude: 44.8297,
        longitude: -0.5972,
        websiteUrl: 'https://www.chu-bordeaux.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Hôpital Haut-Lévêque (CHU)',
        adresse: 'Avenue de Magellan, 33604 Pessac',
        latitude: 44.7756,
        longitude: -0.6156,
        websiteUrl: 'https://www.chu-bordeaux.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Clinique Tivoli-Ducos',
        adresse: '91 rue de Rivière, 33000 Bordeaux',
        latitude: 44.8356,
        longitude: -0.5683,
        websiteUrl: 'https://www.clinique-tivoli.com',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Lille',
    sites: [
      {
        nom: 'Hôpital Claude Huriez (CHU Lille)',
        adresse: 'Rue Michel de Montaigne, 59037 Lille',
        latitude: 50.6092,
        longitude: 3.0444,
        websiteUrl: 'https://www.chu-lille.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'CHU Roger-Salengro',
        adresse: 'Rue Emile Laine, 59037 Lille',
        latitude: 50.6178,
        longitude: 3.0678,
        websiteUrl: 'https://www.chu-lille.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Clinique de la Louvière',
        adresse: '27 rue de la Louvière, 59800 Lille',
        latitude: 50.6319,
        longitude: 3.0583,
        websiteUrl: 'https://www.cliniquelouviere.fr',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Rennes',
    sites: [
      {
        nom: 'CHU Pontchaillou',
        adresse: '2 rue Henri Le Guilloux, 35033 Rennes',
        latitude: 48.1203,
        longitude: -1.6986,
        websiteUrl: 'https://www.chu-rennes.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'CHU Hôpital Sud',
        adresse: '16 boulevard de Bulgarie, 35200 Rennes',
        latitude: 48.0522,
        longitude: -1.6389,
        websiteUrl: 'https://www.chu-rennes.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Clinique Saint-Laurent Rennes',
        adresse: '91 rue Saint-Hélier, 35000 Rennes',
        latitude: 48.1089,
        longitude: -1.6786,
        websiteUrl: 'https://www.clinique-saint-laurent-rennes.fr',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Grenoble',
    sites: [
      {
        nom: 'CHU Grenoble Alpes - Nord',
        adresse: 'Boulevard de la Chantourne, 38700 La Tronche',
        latitude: 45.1917,
        longitude: 5.7319,
        websiteUrl: 'https://www.chu-grenoble.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Hôpital Couple-Enfant (CHU Grenoble Alpes)',
        adresse: 'Avenue Maquis du Grésivaudan, 38700 La Tronche',
        latitude: 45.1872,
        longitude: 5.7544,
        websiteUrl: 'https://www.chu-grenoble.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Clinique Mutualiste de Grenoble',
        adresse: '6 rue Berthe de Boissieux, 38000 Grenoble',
        latitude: 45.1889,
        longitude: 5.7244,
        websiteUrl: 'https://www.clinique-mutualiste-grenoble.fr',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Dijon',
    sites: [
      {
        nom: 'CHU Dijon Bourgogne - François Mitterrand',
        adresse: '14 rue Paul Gaffarel, 21000 Dijon',
        latitude: 47.3222,
        longitude: 5.0417,
        websiteUrl: 'https://www.chu-dijon.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Hôpital d\'Enfants du CHU Dijon Bourgogne',
        adresse: '10 boulevard Maréchal de Lattre de Tassigny, 21000 Dijon',
        latitude: 47.3228,
        longitude: 5.0489,
        websiteUrl: 'https://www.chu-dijon.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Polyclinique du Parc',
        adresse: '14 rue Général Saussier, 21000 Dijon',
        latitude: 47.3156,
        longitude: 5.0489,
        websiteUrl: 'https://www.polyclinique-du-parc-dijon.fr',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Limoges',
    sites: [
      {
        nom: 'CHU de Limoges',
        adresse: '2 avenue Martin Luther King, 87042 Limoges',
        latitude: 45.8167,
        longitude: 1.2611,
        websiteUrl: 'https://www.chu-limoges.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Hôpital Esquirol (CHU de Limoges)',
        adresse: '7 avenue du Maréchal de Lattre de Tassigny, 87000 Limoges',
        latitude: 45.8342,
        longitude: 1.2456,
        websiteUrl: 'https://www.chu-limoges.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Clinique du Pont Neuf',
        adresse: '20 rue du Pont Saint-Étienne, 87000 Limoges',
        latitude: 45.8289,
        longitude: 1.2583,
        websiteUrl: 'https://www.clinique-pont-neuf-limoges.fr',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Poitiers',
    sites: [
      {
        nom: 'CHU de Poitiers',
        adresse: '2 rue de la Milétrie, 86021 Poitiers',
        latitude: 46.5675,
        longitude: 0.3667,
        websiteUrl: 'https://www.chu-poitiers.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Hôpital Les Ragonets (CHU de Poitiers)',
        adresse: '1 rue de la Milétrie, 86000 Poitiers',
        latitude: 46.5711,
        longitude: 0.3589,
        websiteUrl: 'https://www.chu-poitiers.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Clinique Saint-Hilaire',
        adresse: '1 rue de la Milétrie, 86000 Poitiers',
        latitude: 46.5694,
        longitude: 0.3614,
        websiteUrl: 'https://www.clinique-saint-hilaire-poitiers.fr',
        openingHours: horairesClinique,
      },
    ],
  },
  {
    ville: 'Clermont-Ferrand',
    sites: [
      {
        nom: 'CHU Gabriel-Montpied',
        adresse: '58 rue Montalembert, 63003 Clermont-Ferrand',
        latitude: 45.7714,
        longitude: 3.1186,
        websiteUrl: 'https://www.chu-clermontferrand.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Hôpital Estaing (CHU Clermont-Ferrand)',
        adresse: '1 place Lucie Aubrac, 63000 Clermont-Ferrand',
        latitude: 45.7833,
        longitude: 3.1089,
        websiteUrl: 'https://www.chu-clermontferrand.fr',
        openingHours: horairesChu,
      },
      {
        nom: 'Polyclinique de Clermont-Ferrand',
        adresse: '13 boulevard Charles de Gaulle, 63000 Clermont-Ferrand',
        latitude: 45.7769,
        longitude: 3.0944,
        websiteUrl: 'https://www.polyclinique-clermont.fr',
        openingHours: horairesClinique,
      },
    ],
  },
];

/** Format attendu par le planning hebdomadaire du seed (ville + noms de sites). */
export function toVillesAvecSites(): { ville: string; sites: string[] }[] {
  return SEED_SITES_BY_CITY.map(({ ville, sites }) => ({
    ville,
    sites: sites.map((s) => s.nom),
  }));
}
