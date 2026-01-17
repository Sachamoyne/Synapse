# Instructions de Setup Monorepo

⚠️ **IMPORTANT** : Cette migration doit être faite en plusieurs étapes. Le code backend est prêt, mais le déplacement du web dans `apps/web/` nécessite une manipulation git prudente.

## Étape 1 : Créer la structure (à faire manuellement avec git)

```bash
# 1. Créer les dossiers
mkdir -p apps/web apps/backend

# 2. Installer les dépendances backend
cd apps/backend
npm install

# 3. Créer .env pour le backend (copier depuis .env.local)
cp ../../.env.local .env
# Puis ajouter :
# BACKEND_API_KEY=dev_key
# PORT=3001
```

## Étape 2 : Déplacer Next.js dans apps/web (OPTIONNEL pour l'instant)

**Recommandation** : Pour minimiser les risques, laissez le code Next.js à la racine pour l'instant. Le backend peut fonctionner indépendamment.

Si vous voulez quand même déplacer :

```bash
# ⚠️ Faire une sauvegarde d'abord
git stash

# Déplacer tous les fichiers Next.js (sauf .git, node_modules, apps/)
# Utiliser git mv pour préserver l'historique
git mv src apps/web/
git mv public apps/web/
git mv package.json apps/web/
git mv tsconfig.json apps/web/
git mv next.config.ts apps/web/
# ... etc pour tous les fichiers Next.js

# Ajuster les paths dans apps/web/tsconfig.json si nécessaire
```

## Étape 3 : Configurer les variables d'environnement

### Frontend (.env.local ou apps/web/.env.local si déplacé)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_API_KEY=dev_key
# ... autres variables existantes
```

### Backend (apps/backend/.env)
```env
PORT=3001
BACKEND_API_KEY=dev_key
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
```

## Étape 4 : Lancer le backend

```bash
cd apps/backend
npm run dev
# Le backend démarre sur http://localhost:3001
```

## Étape 5 : Lancer le frontend

Si déplacé dans apps/web :
```bash
cd apps/web
npm run dev
```

Sinon (à la racine comme actuellement) :
```bash
npm run dev
```

## Tests

1. Backend : `curl http://localhost:3001/health` (si route health existe)
2. Frontend : Vérifier que les appels vers le backend fonctionnent
3. Import Anki : Tester l'upload d'un fichier .apkg
4. Import PDF : Tester l'upload d'un PDF

## Prochaines étapes

Une fois le backend fonctionnel :
1. Adapter les appels frontend (voir fichiers modifiés)
2. Supprimer les anciennes routes Next.js (optionnel)
3. Déployer le backend séparément (Railway, Render, etc.)
