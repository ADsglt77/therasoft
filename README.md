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

## Commits automatiques

Le projet inclut un script de génération automatique de messages de commit.

### Utilisation

```bash
npm run commit
```

Le script :
1. ✅ Analyse automatiquement les fichiers modifiés
2. ✅ Propose un type et une description basés sur les changements
3. ✅ Affiche un aperçu du message de commit
4. ✅ Permet de confirmer, éditer ou annuler
5. ✅ Exécute `git add -A` et `git commit` automatiquement
6. ❌ **Ne fait PAS de push** (vous devez le faire manuellement)

### Format des messages

Les messages suivent le format : `<emoji> - (<type>) <description>`

**Exemples générés automatiquement :**
- `🎨 - (ui) Update button component`
- `✨ - (feat) Add authentication feature`
- `🐛 - (fix) Fix navbar hover menu`
- `♻️ - (refactor) Update routes structure`
- `📝 - (docs) Update README`
- `🔧 - (chore) Update package dependencies`

### Types disponibles

| Type | Emoji | Usage |
|------|-------|-------|
| `ui` | 🎨 | Composants UI, styles, interfaces |
| `feat` | ✨ | Nouvelles fonctionnalités |
| `fix` | 🐛 | Corrections de bugs |
| `evol` | 🚀 | Évolutions majeures |
| `refactor` | ♻️ | Refactorisation du code |
| `docs` | 📝 | Documentation |
| `chore` | 🔧 | Configuration, scripts, dépendances |
| `test` | ✅ | Tests |
| `perf` | ⚡️ | Optimisations de performance |
| `ci` | 👷 | CI/CD, workflows |

### Options interactives

Lors de l'exécution, vous pouvez :
- **[Enter]** : Confirmer et créer le commit
- **[e]** : Éditer le type et/ou la description
- **[q]** : Annuler l'opération
