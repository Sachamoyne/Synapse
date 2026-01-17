# Notes d'Adaptation des Routes Next.js → Express

## Changements principaux

### 1. Request/Response
- `NextRequest` → `express.Request`
- `NextResponse.json(...)` → `res.json(...)`
- `NextResponse.json(..., { status })` → `res.status(...).json(...)`

### 2. FormData / Fichiers
- `request.formData()` → `multer` middleware
- `file = formData.get("file") as File` → `req.file` (multer)
- `file.arrayBuffer()` → `req.file.buffer` (déjà Buffer avec multer)

### 3. Cookies / Auth
- `request.cookies.getAll()` → `req.cookies` (express cookie-parser optionnel)
- JWT extraction : reste identique (Buffer.from, JSON.parse)

### 4. Headers
- `request.header("name")` → `req.header("name")` ou `req.get("name")`

## Exemple d'adaptation

### Avant (Next.js)
```typescript
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const buffer = await file.arrayBuffer();
  // ...
  return NextResponse.json({ success: true }, { status: 200 });
}
```

### Après (Express)
```typescript
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });

router.post("/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }
  const buffer = req.file.buffer; // Déjà un Buffer
  // ...
  res.json({ success: true });
});
```

## Code à copier directement

Tout le code de logique métier (fonctions helper, parsing Anki, etc.) peut être copié tel quel :
- `validateTimestamp`
- `ankiTimestampToDate`
- `normalizeAnkiDueDate`
- `validateCardData`
- `parseDeckName`
- `getOrCreateDeck`
- `decodeHtmlEntities`
- `rewriteMediaUrls`
- Toute la logique SQLite/AdmZip
- Toute la logique Supabase

## Ce qui change

**Uniquement** :
1. Signature de la fonction (req, res au lieu de request)
2. Lecture du fichier (multer au lieu de formData)
3. Réponses (res.json au lieu de NextResponse.json)
4. Cookies (req.cookies au lieu de request.cookies)

**Reste identique** :
- Toute la logique métier
- Les appels Supabase
- Les appels SQLite
- Les validations
- Les transformations de données
