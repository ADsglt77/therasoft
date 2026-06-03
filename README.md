# Portail Médecin

Planning + dossiers patients · Angular · Express · PostgreSQL · **Docker only**

## Lancer

```bash
cp .env.example .env
docker compose up --build
```

→ http://localhost

## Déploiement Dokploy

Si le déploiement échoue avec `Bind for 0.0.0.0:80 failed: port is already allocated`, le port 80 est déjà utilisé (proxy Dokploy, ancien stack, etc.).

**Solution recommandée** — ajouter le fichier compose Dokploy (pas de port publié sur l'hôte) :

- Fichiers compose : `docker-compose.yml` + `docker-compose.dokploy.yml`
- Dans Dokploy, domaine → service **nginx**, port **80** (réseau interne Docker)

Variables prod importantes : `RESET_DB_ON_SEED=false`, `FRONTEND_ORIGIN=https://ton-domaine.fr`, secrets JWT ≥ 32 caractères.

**Alternative** — libérer le port 80 sur le serveur ou changer `HTTP_PORT` (ex. `8080`) si tu n'utilises pas le proxy Dokploy.

## Connexion

| Email | Mot de passe |
|-------|--------------|
| `user@user.user` | `Azertyuiop1!` |
| `user2@user.user` | `Azertyuiop1!` |

## Commandes

```bash
docker compose up -d --build   # démarrer (prod)
docker compose down            # arrêter
docker compose logs -f backend # logs
docker compose down -v         # reset total (base incluse)
```

## Développement (hot-reload)

Même URL **http://localhost** : nginx proxy vers `ng serve` (frontend) et `tsx watch` (backend). Les changements dans `frontend/src` et `backend/src` sont pris en compte sans rebuild complet.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Arrêter Prisma Studio avant un `down` complet si le profil studio est actif :

```bash
docker compose --profile studio down
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

Revenir à la stack prod :

```bash
docker compose up -d --build
```

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
