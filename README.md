# Portail Médecin

Planning + dossiers patients · Angular · Express · PostgreSQL · **Docker only**

## Lancer

```bash
cp .env.example .env
docker compose up --build
```

→ http://localhost

## Connexion

| Email | Mot de passe |
|-------|--------------|
| `user@user.user` | `Azertyuiop1!` |
| `user2@user.user` | `Azertyuiop1!` |

## Commandes

```bash
docker compose up -d --build   # démarrer
docker compose down            # arrêter
docker compose logs -f backend # logs
docker compose down -v         # reset total (base incluse)
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
