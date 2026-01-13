# Portail Médecin

Monorepo pour l'application Portail Médecin (Angular 19 + Express + Prisma + PostgreSQL).

## Structure

```
.
├── frontend/          # Application Angular 19
├── backend/           # API Express + Prisma
└── docker-compose.yml # Configuration Docker
```

## Prérequis

- Docker & Docker Compose
- Node.js 20+ (pour développement local)

## Démarrage rapide

### Avec Docker Compose (recommandé)

1. Copier le fichier d'environnement :
```bash
cp env.template .env
```

2. Lancer tous les services :
```bash
docker compose up
```

Les services seront disponibles sur :
- Frontend : http://localhost:4200
- Backend : http://localhost:3000
- Database : localhost:5432

### Migrations Prisma

Pour exécuter les migrations Prisma dans le conteneur backend :

```bash
docker compose exec backend npx prisma migrate dev
```

Pour générer le client Prisma :

```bash
docker compose exec backend npx prisma generate
```

## Développement local

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Endpoints API

- `GET /api/health` - Health check

