# Politique de mot de passe

## Règles de validation

Un mot de passe est valide si:
- **longueur >= 12** caractères
- contient au moins **1 majuscule** [A-Z]
- contient au moins **1 minuscule** [a-z]
- contient au moins **1 chiffre** [0-9]
- contient au moins **1 caractère spécial** [^A-Za-z0-9]

## Endpoints concernés

- `POST /api/auth/register` - Inscription
- `PATCH /api/auth/password` - Changement de mot de passe

## Messages d'erreur

Les messages d'erreur sont en anglais et constants:
- `"Password must be at least 12 characters long."`
- `"Password must contain at least 1 uppercase letter."`
- `"Password must contain at least 1 lowercase letter."`
- `"Password must contain at least 1 number."`
- `"Password must contain at least 1 special character."`

## Format de réponse d'erreur

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Données invalides",
    "details": [
      {
        "path": ["password"],
        "message": "Password must be at least 12 characters long."
      }
    ]
  },
  "requestId": "uuid-here"
}
```

## Exemples de tests

### ✅ Mots de passe valides

- `"Password123!"` ✅
- `"MySecure@Pass2024"` ✅
- `"Test#Password99"` ✅
- `"Complex!Pass123"` ✅

### ❌ Mots de passe invalides

- `"password123!"` ❌ (pas de majuscule)
  - Erreur: `"Password must contain at least 1 uppercase letter."`

- `"PASSWORD123!"` ❌ (pas de minuscule)
  - Erreur: `"Password must contain at least 1 lowercase letter."`

- `"Password!!!!"` ❌ (pas de chiffre)
  - Erreur: `"Password must contain at least 1 number."`

- `"Password1234"` ❌ (pas de caractère spécial)
  - Erreur: `"Password must contain at least 1 special character."`

- `"Pass1!"` ❌ (trop court, < 12)
  - Erreur: `"Password must be at least 12 characters long."`

## Implémentation

### Backend
- Schéma Zod: `backend/src/features/auth/schemas/auth.schemas.ts`
- Fonction: `passwordSchema` (réutilisable)

### Frontend
- Validateur Angular: `frontend/src/app/core/validators/password.validator.ts`
- Messages d'erreur: `frontend/src/app/core/utils/input-error-messages.ts`

