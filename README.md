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
3. Variables obligatoires :
   - `RESET_DB_ON_SEED=true` — à chaque déploiement, le backend refait `db push` + reset + seed (données démo fraîches)
   - `FRONTEND_ORIGIN=https://ton-domaine.fr`
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` ≥ 32 caractères
   - `BETTER_AUTH_SECRET` ≥ 32 caractères
   - `DB_PASSWORD`, `DB_NAME`, `DB_USER`

À chaque push / redémarrage du conteneur **backend**, l’entrypoint exécute automatiquement :

```text
prisma generate → prisma db push --force-reset → prisma db seed (données démo)
```

Les comptes démo (voir tableau ci-dessous) sont recréés à chaque fois.

> Pour une vraie prod avec données persistantes : `RESET_DB_ON_SEED=false` (le seed est alors ignoré si des médecins existent déjà).

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

Au démarrage, l’entrypoint exécute `prisma db push --accept-data-loss` (colonnes legacy supprimées, rôle `ADMIN` → `SECRETAIRE` sur les bases existantes). Avec `RESET_DB_ON_SEED=true` (défaut), la base et les uploads sont vidés puis reseedés.

## Commandes

```powershell
.\docker.ps1 up prod          # démarrer (prod)
.\docker.ps1 down prod        # arrêter + supprimer volumes (BDD incluse)
.\docker.ps1 up dev           # démarrer (hot-reload)
.\docker.ps1 down dev         # arrêter + supprimer volumes (BDD incluse)
```

`down` supprime **tout** (conteneurs, volumes PostgreSQL, uploads). Au prochain `up`, la base est recréée et seedée automatiquement (`RESET_DB_ON_SEED=true` par défaut en local).

En mode `dev`, les changements dans `frontend/src` et `backend/src` sont pris en compte sans rebuild complet (hot-reload).

URL locale : `http://localhost`.

## Prisma Studio

```bash
docker compose --profile studio up studio
```

→ http://localhost:5555

## .env (minimum)

- `DB_PASSWORD` — mot de passe PostgreSQL
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — secrets aléatoires
- `BETTER_AUTH_SECRET` — secret Better Auth (fallback sur `JWT_ACCESS_SECRET` si absent)
- `HTTP_PORT` — port app (défaut `80`)
- `RESET_DB_ON_SEED=true` sur Dokploy démo (reset à chaque deploy) · `false` si prod réelle
