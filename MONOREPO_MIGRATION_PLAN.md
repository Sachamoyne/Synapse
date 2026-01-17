# Plan de Migration Monorepo

## Objectif
Transformer le projet en monorepo pour sortir les API lourdes (Anki, PDF) de Vercel vers une app Node séparée.

## Structure Cible
```
Soma/
├── apps/
│   ├── web/          # Next.js (migré depuis racine)
│   └── backend/      # Express API (nouveau)
├── package.json      # Root workspace (optionnel)
└── README.md
```

## Routes à Migrer

### Depuis Next.js vers Backend Express
1. `POST /api/import/anki` → `POST /anki/import`
2. `POST /api/generate-cards-from-pdf` → `POST /pdf/generate-cards`
3. `POST /api/generate-cards` → **Reste dans Next.js** (moins lourd, optionnel)

## Étape 1 : Structure Monorepo (À faire manuellement avec git)

⚠️ **IMPORTANT** : Pour éviter de casser git, cette étape doit être faite manuellement :

```bash
# 1. Créer la structure
mkdir -p apps/web apps/backend

# 2. Déplacer tout le contenu actuel dans apps/web (sauf .git, node_modules)
# ATTENTION: Ne pas déplacer .git, node_modules/, apps/
mv src apps/web/
mv public apps/web/
mv package.json apps/web/
mv tsconfig.json apps/web/
mv next.config.ts apps/web/
mv tailwind.config.ts apps/web/
mv postcss.config.mjs apps/web/
mv middleware.ts apps/web/
mv components.json apps/web/
# ... tous les autres fichiers Next.js

# 3. Ajuster les imports si nécessaire (généralement @/ reste correct)
```

## Étape 2 : Backend Express

Créer `apps/backend/` avec Express TypeScript qui héberge :
- POST `/anki/import` (avec multer pour FormData)
- POST `/pdf/generate-cards` (avec multer)

## Étape 3 : Frontend - Adapter les appels

Remplacer dans le code frontend :
- `/api/import/anki` → `${process.env.NEXT_PUBLIC_BACKEND_URL}/anki/import`
- `/api/generate-cards-from-pdf` → `${process.env.NEXT_PUBLIC_BACKEND_URL}/pdf/generate-cards`

## Étape 4 : Sécurité

- Middleware backend : vérifier `x-soma-backend-key` header
- Frontend : envoyer `NEXT_PUBLIC_BACKEND_API_KEY` dans header

## Étape 5 : Dev Local

- Backend sur port 3001
- Frontend sur port 3000
- Root script optionnel pour lancer les deux
