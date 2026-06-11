# Portail Médecin

Planning + dossiers patients · Angular · Express · PostgreSQL

- **Dev** : back et front en natif (hot-reload), base PostgreSQL via Docker.
- **Prod** : un seul `docker-compose.yml` (déployé par Dokploy).

## Développement (local, natif)

Un seul fichier d'environnement, à la racine (`.env`).

```bash
# 1. Base PostgreSQL (Docker, publiée sur 127.0.0.1:5432)
cp .env.example .env            # un seul .env pour tout le projet
docker compose up -d db

# 2. Backend → http://localhost:3000
cd backend
npm install
npx prisma generate
npx prisma migrate deploy       # applique le schéma
npm run prisma:seed             # démo (une seule fois : ignoré si déjà peuplé)
npm run dev                     # tsx watch (charge le .env racine)

# 3. Frontend → http://localhost:4200
cd ../frontend
npm install
npm start                       # ng serve ; proxy.conf.json route /api vers :3000
```

→ Application : **http://localhost:4200**

## Déploiement Dokploy

Dokploy utilise l’unique `docker-compose.yml` (nginx + backend + frontend buildés en image, sans port sur l’hôte).

Dans Dokploy :

1. **Compose file** : `docker-compose.yml` seulement
2. **Domaine** → service **nginx**, port conteneur **80**
3. Variables obligatoires :
   - `FRONTEND_ORIGIN=https://ton-domaine.fr`
   - `APP_URL=https://ton-domaine.fr`
   - `AUTH_SECRET` ≥ 32 caractères
   - `DB_PASSWORD`, `DB_NAME`, `DB_USER`
   - `NODE_ENV=production`

À chaque push / redémarrage du conteneur **backend**, l’entrypoint exécute automatiquement,
**sans jamais réinitialiser la base** :

```text
prisma migrate deploy   # applique uniquement les migrations en attente
prisma db seed          # idempotent : ne peuple qu'une base vide (seed une seule fois)
```

Les comptes démo (voir tableau ci-dessous) sont créés au premier déploiement, puis le seed
est ignoré tant que des données existent. Aucune donnée n'est jamais effacée.

Si l’erreur `port is already allocated` revient, un autre service occupe encore le port 80 sur le serveur (ancien déploiement) — le retirer dans Dokploy ou arrêter l’ancien conteneur.

## Connexion

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Médecin | `user@user.user` | `Azertyuiop1!` |
| Médecin | `user2@user.user` | `Azertyuiop1!` |

> Les **patients** ne sont pas pré-créés : ils s'inscrivent eux-mêmes via la page `/register` (choix du médecin à l'inscription).

## Base de données (Prisma)

Le schéma est versionné via des **migrations Prisma** (`backend/prisma/migrations/`), appliquées au démarrage du backend avec `prisma migrate deploy`.

Après avoir modifié `backend/prisma/schema.prisma`, générer une migration :

```bash
# en local (crée le fichier SQL + applique + regénère le client)
cd backend
npx prisma migrate dev --name <description>
# puis committer le dossier généré dans prisma/migrations/
```

Au démarrage, l’entrypoint exécute `prisma migrate deploy` (jamais de reset) puis
`prisma db seed`. Le seed est **idempotent** : il ne crée les données de démonstration
que si la base est vide, donc il ne s’exécute qu’une seule fois. Les données existantes
ne sont jamais effacées.

## Commandes

```bash
# Base seule (dev natif)
docker compose up -d db          # démarrer PostgreSQL (localhost:5432)
docker compose down              # arrêter (conserve les volumes BDD + uploads)
docker compose down -v           # arrêter + supprimer explicitement les volumes

# Stack complète façon prod (test local des images)
docker compose up --build        # nginx interne sur :80 (pas publié)
```

Les changements dans `frontend/src` (ng serve) et `backend/src` (tsx watch) sont pris
en compte immédiatement, sans rebuild.

## Prisma Studio

```bash
cd backend
npx prisma studio                # → http://localhost:5555
```

## Variables d'environnement

**Un seul fichier `.env` à la racine** (voir [.env.example](.env.example)), utilisé à la fois par
`docker-compose.yml` (interpolation `${...}`) et par le backend en dev natif
(`npm run dev` le charge via `--env-file=../.env`).

- `DB_USER`, `DB_PASSWORD`, `DB_NAME` — base PostgreSQL (compose)
- `DATABASE_URL` — connexion du backend en dev natif (mêmes identifiants, vers `localhost:5432`)
- `AUTH_SECRET` — secret aléatoire (≥ 32 caractères)
- `FRONTEND_ORIGIN` et `APP_URL` — URL exacte du front (`http://localhost:4200` en dev, domaine public en prod)
- `NODE_ENV` — `development` en local · `production` en prod
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` — emails de vérification

En prod (Dokploy), ces variables sont définies dans le panneau, pas dans un fichier committé.

## Qualité

```bash
cd backend
npm run format:check
npm run lint
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
npm test
npx prisma validate

cd ../frontend
npm run lint
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
npm test
npm run build
```

La CI exécute les mêmes contrôles avec Node.js 22.
