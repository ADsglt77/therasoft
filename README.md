# Portail Médecin

Application web pour radiologues : consulter le **planning** (vacations et rendez-vous) et les **dossiers patients**.

**Stack :** Angular 19 · Express · Prisma · PostgreSQL · Docker · Nginx

> L'application tourne **uniquement avec Docker Compose**. Pas de `npm start` ou `ng serve` en local.

---

## Sommaire

1. [Prérequis](#prérequis)
2. [Installation et démarrage](#installation-et-démarrage)
3. [Utiliser l'application](#utiliser-lapplication)
4. [Configuration (.env)](#configuration-env)
5. [Architecture Docker](#architecture-docker)
6. [Commandes utiles](#commandes-utiles)
7. [Base de données](#base-de-données)
8. [Dépannage](#dépannage)

---

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré
- Git (pour cloner le projet)

---

## Installation et démarrage

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd therasoft
```

### 2. Créer le fichier d'environnement

```bash
cp .env.example .env
```

Ouvre `.env` et modifie au minimum :
- `DB_PASSWORD` — mot de passe PostgreSQL
- `JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET` — secrets longs et aléatoires

### 3. Lancer l'application

```bash
docker compose up --build
```

Au premier démarrage, Docker :
1. Construit les images (frontend, backend, nginx)
2. Démarre PostgreSQL
3. Applique le schéma Prisma (`db push`)
4. Insère les données de démo (`seed`)
5. Lance l'API Express

### 4. Ouvrir dans le navigateur

| URL | Description |
|-----|-------------|
| http://localhost | Application (page d'accueil) |
| http://localhost/login | Connexion |
| http://localhost/api/health | Vérifier que l'API répond |

> Le port par défaut est **80**. Pour en utiliser un autre, change `HTTP_PORT` dans `.env` (ex. `8080` → http://localhost:8080).

### 5. Arrêter

```bash
# Arrêter les conteneurs (Ctrl+C dans le terminal, ou :)
docker compose down
```

---

## Utiliser l'application

### Se connecter

Comptes créés automatiquement par le seed :

| Email | Mot de passe |
|-------|--------------|
| `user@user.user` | `Azertyuiop1!` |
| `user2@user.user` | `Azertyuiop1!` |

### Parcours principal

1. **Connexion** → redirection vers le calendrier mensuel (`/calendar`)
2. **Cliquer sur un jour** → planning du jour avec la liste des RDV
3. **Cliquer sur « VOIR LE DOSSIER »** → fiche patient (observations, fichiers)
4. **Paramètres** (`/settings`) → modifier nom, prénom, photo, mot de passe

### Pages disponibles

| Route | Description |
|-------|-------------|
| `/` | Page d'accueil (non connecté) |
| `/login` · `/register` | Authentification |
| `/calendar` | Calendrier mensuel |
| `/calendar/:date` | Planning du jour |
| `/calendar/:date/:rdvId` | Dossier patient |
| `/settings` | Paramètres du profil |
| `/site` | Page Sites (placeholder) |

---

## Configuration (.env)

| Variable | Rôle | Exemple |
|----------|------|---------|
| `DB_USER` | Utilisateur PostgreSQL | `postgres` |
| `DB_PASSWORD` | Mot de passe PostgreSQL | `monMotDePasse` |
| `DB_NAME` | Nom de la base | `portail_medecin` |
| `HTTP_PORT` | Port d'accès à l'app | `80` |
| `JWT_ACCESS_SECRET` | Secret JWT (access token) | chaîne aléatoire longue |
| `JWT_REFRESH_SECRET` | Secret JWT (refresh token) | chaîne aléatoire longue |
| `ACCESS_TOKEN_TTL_MINUTES` | Durée du token d'accès | `15` |
| `REFRESH_TOKEN_TTL_DAYS` | Durée du refresh token | `7` |
| `FRONTEND_ORIGIN` | URL publique du frontend (CORS) | `http://localhost` |
| `NODE_ENV` | Environnement | `production` |
| `RESET_DB_ON_SEED` | Reset complet des données à chaque démarrage backend | `true` (démo) / `false` (prod) |

> **Production :** mets `RESET_DB_ON_SEED=false` pour ne pas effacer les données à chaque redémarrage.

---

## Architecture Docker

```
Navigateur
    │
    ▼
┌─────────┐     /api/*  ┌─────────┐     ┌────────────┐
│  nginx  │ ──────────► │ backend │ ───►│ PostgreSQL │
│  :80    │             │  :3000  │     │    (db)    │
└─────────┘             └─────────┘     └────────────┘
    │
    │  /*
    ▼
┌─────────┐
│frontend │  (Angular buildé, servi par nginx interne)
└─────────┘
```

| Service | Rôle |
|---------|------|
| **nginx** | Point d'entrée unique — sert le frontend et proxy `/api` vers le backend |
| **frontend** | Application Angular compilée |
| **backend** | API REST Express + Prisma |
| **db** | Base PostgreSQL 16 (données persistées dans un volume Docker) |

---

## Commandes utiles

### Gestion des conteneurs

```bash
# Démarrer (première fois ou après changement de code)
docker compose up --build

# Démarrer en arrière-plan
docker compose up -d --build

# Voir l'état des services
docker compose ps

# Voir les logs
docker compose logs -f
docker compose logs -f backend
docker compose logs -f nginx

# Arrêter et supprimer les conteneurs
docker compose down

# Tout supprimer y compris la base de données (⚠️ perte de données)
docker compose down -v
```

### Après modification du code

```bash
# Reconstruire et relancer
docker compose up --build

# Reconstruire un seul service
docker compose up --build backend
docker compose up --build frontend
```

---

## Base de données

### Prisma Studio (interface graphique)

```bash
docker compose exec backend npx prisma studio --port 5555 --browser none
```

Ouvre **http://localhost:5555** dans le navigateur.

### Relancer le seed manuellement

```bash
docker compose exec backend npm run prisma:seed
```

### Appliquer un changement de schéma

Après modification de `backend/prisma/schema.prisma` :

```bash
docker compose up --build backend
```

Le backend exécute automatiquement `prisma db push` au démarrage.

### Données créées par le seed

- 3 médecins (1 admin, 2 actifs)
- 30 patients
- Vacations sur l'année 2026
- ~3200 rendez-vous
- 1 dossier médical par RDV

---

## Dépannage

### Le port 80 est déjà utilisé

Change dans `.env` :
```
HTTP_PORT=8080
```
Puis relance : `docker compose up --build` → http://localhost:8080

### L'application ne démarre pas

```bash
docker compose ps          # vérifier que tous les services sont "Up"
docker compose logs backend # lire les erreurs backend
```

### Base vide ou erreur de connexion

```bash
docker compose down
docker compose up --build
```

Attends que le backend affiche « Starting application... » dans les logs.

### Repartir de zéro (reset complet)

```bash
docker compose down -v
docker compose up --build
```

---

## Structure du projet

```
.
├── frontend/           # Angular 19 (composants, pages, services)
├── backend/            # Express + Prisma (API, auth, planning, patients)
├── nginx/              # Reverse proxy
├── docker-compose.yml  # Orchestration Docker
├── .env.example        # Modèle de configuration
└── README.md
```

---

## API principale

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/register` | Inscription |
| GET | `/api/auth/me` | Profil connecté |
| GET | `/api/planning` | Vacations du médecin |
| GET | `/api/planning/rdvs/me?date=` | RDV du jour |
| GET | `/api/patients/:id/rdv/:id/dossier` | Dossier patient |
