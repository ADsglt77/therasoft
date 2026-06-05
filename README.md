# Portail Médecin

Planning + dossiers patients · Angular · Express · PostgreSQL · **Docker only**

## Lancer (local)

```bash
cp .env.example .env
docker compose up --build
```

→ http://localhost (`docker-compose.override.yml` expose le port 80 en local uniquement)

## Déploiement Dokploy

Dokploy n’utilise que `docker-compose.yml` (sans port 80 sur l’hôte) — **ne pas** ajouter de second fichier compose sauf besoin particulier.

Dans Dokploy :

1. **Compose file** : `docker-compose.yml` seulement
2. **Domaine** → service **nginx**, port conteneur **80**
3. Variables : `RESET_DB_ON_SEED=false`, `FRONTEND_ORIGIN=https://ton-domaine.fr`, JWT ≥ 32 caractères

Si l’erreur `port is already allocated` revient, un autre service occupe encore le port 80 sur le serveur (ancien déploiement) — le retirer dans Dokploy ou arrêter l’ancien conteneur.

## Connexion

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Médecin | `user@user.user` | `Azertyuiop1!` |
| Médecin | `user2@user.user` | `Azertyuiop1!` |
| Secrétaire (démo) | `secretaire@demo.demo` | `Azertyuiop1!` |

## Base de données (Prisma)

Le schéma est synchronisé avec **`prisma db push`** au démarrage du backend (pas de fichiers SQL dans le dépôt).

Modifier `backend/prisma/schema.prisma`, puis :

```bash
docker compose up -d --build
# ou, conteneur déjà lancé :
docker compose exec backend npx prisma db push --accept-data-loss
```

Au démarrage, l’entrypoint exécute `prisma db push --accept-data-loss` (colonnes legacy supprimées, rôle `ADMIN` → `SECRETAIRE` sur les bases existantes). En prod Dokploy, garder `RESET_DB_ON_SEED=false` pour ne pas effacer les données.

Reset complet (volume PostgreSQL) : `docker compose down -v` puis `docker compose up --build`.

## Commandes

```powershell
.\docker.ps1 up prod          # démarrer (prod)
.\docker.ps1 down prod        # arrêter
.\docker.ps1 up dev           # démarrer (hot-reload)
.\docker.ps1 down dev        # arrêter
```

En mode `dev`, les changements dans `frontend/src` et `backend/src` sont pris en compte sans rebuild complet (hot-reload).

Arrêter Prisma Studio avant un `down` complet si le profil studio est actif :

```bash
docker compose --profile studio down
./docker.ps1 down dev
```

URL locale : `http://localhost`.

## Prisma Studio

```bash
docker compose --profile studio up studio
```

→ http://localhost:5555

## .env (minimum)

- `DB_PASSWORD` — mot de passe PostgreSQL
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — secrets aléatoires
- `HTTP_PORT` — port app (défaut `80`)
- `RESET_DB_ON_SEED=false` en prod
