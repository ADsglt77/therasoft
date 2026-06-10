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
   - `RESET_DB_ON_SEED=false` — valeur de production, conserve les données et applique seulement les migrations
   - `FRONTEND_ORIGIN=https://ton-domaine.fr`
   - `APP_URL=https://ton-domaine.fr`
   - `AUTH_SECRET` ≥ 32 caractères
   - `DB_PASSWORD`, `DB_NAME`, `DB_USER`

À chaque push / redémarrage du conteneur **backend**, l’entrypoint exécute automatiquement :

```text
RESET_DB_ON_SEED=false : prisma migrate deploy
RESET_DB_ON_SEED=true  : drop schema → prisma migrate deploy → prisma db seed
```

Les comptes démo (voir tableau ci-dessous) sont recréés uniquement lorsque
`RESET_DB_ON_SEED=true` est activé explicitement.

> `RESET_DB_ON_SEED=true` détruit le schéma et les uploads au démarrage. Cette option est réservée aux environnements de démonstration jetables.

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
docker compose exec backend npx prisma migrate dev --name <description>
# puis committer le dossier généré dans prisma/migrations/
```

Au démarrage, l’entrypoint exécute `prisma migrate deploy`. Par défaut,
`RESET_DB_ON_SEED=false` conserve les données. Avec `RESET_DB_ON_SEED=true`, le schéma
est réinitialisé puis les migrations et les données de démonstration sont rejouées.
Sur une base pré-migrations existante, le démarrage échoue volontairement. Après avoir
vérifié manuellement que son schéma correspond à `0_init`, définir
`BASELINE_EXISTING_DB=true` pour un seul démarrage afin de marquer cette migration
comme appliquée, puis remettre la variable à `false`.

## Commandes

```powershell
.\docker.ps1 up prod          # démarrer (prod)
.\docker.ps1 down prod        # arrêter en conservant BDD et uploads
.\docker.ps1 down prod -PurgeData # arrêter + supprimer explicitement les volumes
.\docker.ps1 up dev           # démarrer (hot-reload)
.\docker.ps1 down dev         # arrêter en conservant BDD et uploads
```

`down` conserve les volumes PostgreSQL et uploads. La suppression des données exige
désormais l'option explicite `-PurgeData`. Pour recréer les données de démonstration
au prochain `up`, définir aussi `RESET_DB_ON_SEED=true`.

En mode `dev`, les changements dans `frontend/src` et `backend/src` sont pris en compte sans rebuild complet (hot-reload).

URL locale : `http://localhost`.

## Prisma Studio

```bash
docker compose --profile studio up studio
```

→ http://localhost:5555

## .env (minimum)

- `DB_PASSWORD` — mot de passe PostgreSQL
- `AUTH_SECRET` — secret aléatoire (≥ 32 caractères)
- `HTTP_PORT` — port app (défaut `80`)
- `FRONTEND_ORIGIN` et `APP_URL` — URL publique exacte de l’application
- `RESET_DB_ON_SEED=true` sur une démo jetable uniquement · `false` en production
- `BASELINE_EXISTING_DB=true` — usage ponctuel pour une ancienne base sans historique Prisma
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` — emails de vérification

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
