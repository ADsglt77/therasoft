# Récap : ce qui reste à faire (par priorité)

Copie-colle chaque bloc dans Cursor pour traiter la priorité concernée.

---

## Priorité haute (sécurité)

**Prompt 1 — Secrets JWT**  
Dans `.env`, remplacer les secrets JWT faibles (`123`, `1234`) par des secrets longs et aléatoires. Documenter dans `.env.example` comment les générer (ex. `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`). Ne pas commiter le vrai `.env`.

**Prompt 2 — IDOR sur dossiers patients**  
Sur les routes patients (`GET/PATCH .../dossier`), vérifier que le RDV appartient au médecin connecté (via Modalite → Vacation → medecinId). Sinon retourner 403. Fichiers : `backend/src/features/patients/routes/patient.routes.ts`, `patient.service.ts`.

**Prompt 3 — Filtrer GET /api/planning/rdvs**  
`GET /api/planning/rdvs` renvoie tous les RDVs. Le filtrer par `req.user.medecinId` (comme `/rdvs/me`) ou le réserver aux admins. Fichier : `backend/src/features/planning/routes/planning.routes.ts`, `rdv.service.ts`.

**Prompt 4 — Rate limiting sur l’auth**  
Ajouter un rate limit (ex. `express-rate-limit`) sur `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh` pour limiter le bruteforce. Fichier : `backend/src/app.ts` ou routes auth.

**Prompt 5 — Protéger /uploads**  
Les fichiers sous `app.use('/uploads', ...)` sont publics. Servir les uploads uniquement pour les utilisateurs authentifiés, ou déplacer hors de la racine publique. Fichier : `backend/src/app.ts`.

---

## Priorité moyenne (qualité / cohérence)

**Prompt 6 — Migration Prisma**  
Le schéma a été nettoyé (modèle AudioRecording et champs audio du Dossier supprimés). Créer une migration : `npx prisma migrate dev --name remove-audio-models`. Vérifier que le seed et l’app fonctionnent après.

**Prompt 7 — Typer VoiceRecognitionService**  
Remplacer les `any` dans `voice-recognition.service.ts` (recognition, event) par les types Web Speech API si disponibles, ou des interfaces minimales. Fichier : `frontend/src/app/core/services/voice-recognition.service.ts`.

**Prompt 8 — Fichier environment production**  
Ajouter `environment.prod.ts` (ou équivalent) avec `apiBaseUrl` et config adaptés à la prod. Fichier : `frontend/src/environments/`.

---

## Priorité basse (optionnel)

**Prompt 9 — Accessibilité**  
Vérifier les templates : aria-label sur les boutons/liens, messages d’erreur associés aux champs, contraste. Corriger les manques évidents.

**Prompt 10 — Logs et monitoring**  
Remplacer les `console.log`/`console.error` restants par un logger structuré (ex. pino) et ne pas logger de données sensibles (corps de requête, tokens, dossiers).

---

## Ordre suggéré

1. Priorité haute (sécurité) : 1 → 2 → 3 → 4 → 5  
2. Priorité moyenne : 6 → 7 → 8  
3. Priorité basse : 9 et 10 si besoin
