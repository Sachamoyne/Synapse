# Monorepo Setup - Soma Backend

## Structure

```
Soma/
├── apps/
│   ├── backend/          # Express API (NOUVEAU)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts
│   │   │   └── routes/
│   │   │       ├── anki.ts      # À créer (adapté de src/app/api/import/anki/route.ts)
│   │   │       └── pdf.ts       # À créer (adapté de src/app/api/generate-cards-from-pdf/route.ts)
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/              # Next.js (optionnel - à déplacer depuis racine)
├── src/                  # Next.js actuel (à déplacer dans apps/web/ si souhaité)
└── README_MONOREPO.md
```

## Endpoints Backend

### POST `/anki/import`
- **Input**: `multipart/form-data` avec champ `file` (.apkg)
- **Output**: `{ success: true, imported: number, decks: number }`
- **Auth**: Header `x-soma-backend-key` requis

### POST `/pdf/generate-cards`
- **Input**: `multipart/form-data` avec `file` (PDF) + `deck_id` + `language`
- **Output**: `{ cards: [...], deck_id: string }` (preview, pas encore inséré)
- **Auth**: Header `x-soma-backend-key` requis

## Variables d'Environnement

### Backend (apps/backend/.env)
```env
PORT=3001
BACKEND_API_KEY=dev_key  # En dev, peut être omis (warning)

NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_API_KEY=dev_key

# Autres variables existantes...
```

## Installation & Démarrage

### Backend
```bash
cd apps/backend
npm install
npm run dev  # Démarre sur port 3001
```

### Frontend
```bash
# Si déplacé dans apps/web
cd apps/web
npm install
npm run dev

# Sinon (à la racine)
npm run dev
```

## Adaptation des Routes

Les routes Anki et PDF doivent être adaptées depuis Next.js vers Express :

1. **Copier** toute la logique métier (fonctions helper, parsing, etc.)
2. **Adapter** uniquement :
   - `NextRequest` → `express.Request`
   - `NextResponse.json(...)` → `res.json(...)`
   - `request.formData()` → multer `req.file`
   - `request.cookies` → `req.cookies`

Voir `apps/backend/ROUTE_ADAPTATION_NOTES.md` pour les détails.

## Sécurité

Le backend vérifie le header `x-soma-backend-key` :
- **Dev** : Si `BACKEND_API_KEY` non défini, permet toutes les requêtes avec warning
- **Prod** : `BACKEND_API_KEY` obligatoire

Le frontend envoie `NEXT_PUBLIC_BACKEND_API_KEY` dans le header `x-soma-backend-key`.

## Prochaines Étapes

1. ✅ Structure backend créée
2. ⏳ Adapter route Anki (copier logique + adapter I/O)
3. ⏳ Adapter route PDF (copier logique + adapter I/O)
4. ⏳ Modifier appels frontend (remplacer URLs)
5. ⏳ Tester local (Anki + PDF)
6. ⏳ Optionnel : Déplacer Next.js dans apps/web/
7. ⏳ Déployer backend séparément

## Notes

- Le code backend est indépendant du frontend
- Les routes Next.js existantes peuvent rester (elles ne seront plus appelées)
- Le déplacement dans `apps/web/` est optionnel et peut être fait plus tard avec git
