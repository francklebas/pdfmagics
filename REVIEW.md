# Code Review — `pdfmagics`

> Date : 2026-05-20 — rev 3

## Vue d'ensemble

Architecture globalement saine pour un MVP : séparation des services, interfaces swappables pour Cloudflare, validation des inputs. Plusieurs bugs bloquants ont été identifiés dans cette passe — ils sont rapides à corriger.

---

## Bugs bloquants

### 1. Méthode `saveFile` dupliquée avec première implémentation incomplète
**Fichier :** `backend/src/services/storage.service.ts:28-68`

Deux déclarations de `saveFile` dans la même classe. La première est incomplète (pas de `return`) et TypeScript rejettera le fichier à la compilation.

```ts
// ligne 28 — incomplète, à supprimer
async saveFile(file: File): Promise<FileInfo> {
  await this.ensureDir();
  if (file.size > this.MAX_FILE_SIZE) { ... }
  // pas de return
}

// ligne 44 — implémentation réelle
async saveFile(file: File): Promise<FileInfo> { ... }
```

---

### 2. `require()` dans un module ESM
**Fichier :** `backend/tests/pdf.test.ts:13`

```ts
if (!require('fs').existsSync(testDir)) {
```

`require` n'est pas défini en ESM. Ce test lève `ReferenceError: require is not defined`. `existsSync` est déjà importé depuis `node:fs` plus haut dans le fichier.

---

### 3. E2E : `waitForEvent('download')` ne se déclenchera jamais
**Fichier :** `frontend/tests/pdfmagics.spec.ts:34-38`

```ts
const downloadPromise = page.waitForEvent('download');
await page.click('text=Generate PDF');
```

Le frontend appelle `window.open(url, '_blank')` — cela ouvre un onglet, pas un téléchargement. L'événement `download` Playwright ne se déclenche pas. Le rapport d'échec dans `playwright-report/` le confirme.

---

### 4. Mauvaise signature de `c.body()` dans Hono
**Fichiers :** `backend/src/index.ts:71-73`, `backend/index.ts:68-71`

```ts
return c.body(pdfBuffer, {
  'Content-Type': 'application/pdf',
  'Content-Disposition': 'attachment; filename="result.pdf"',
});
```

La signature est `c.body(data, status, headers)`. L'objet passé en deuxième argument est interprété comme un statut — le Content-Type et le Content-Disposition ne sont pas envoyés.

```ts
// correct
return c.body(pdfBuffer, 200, {
  'Content-Type': 'application/pdf',
  'Content-Disposition': 'attachment; filename="result.pdf"',
});
```

---

## Bugs notables

### 5. Session non restaurée au rechargement de page
**Fichier :** `frontend/app/stores/pdf.ts:11-15`

```ts
initSession() {
  if (this.sessionId) return;
  this.sessionId = crypto.randomUUID();
  localStorage.setItem('pdf_magic_session', this.sessionId);
},
```

La valeur est sauvegardée dans `localStorage` mais jamais relue. Chaque rechargement génère un nouvel UUID et les fichiers uploadés sont perdus.

```ts
initSession() {
  if (this.sessionId) return;
  this.sessionId = localStorage.getItem('pdf_magic_session') ?? crypto.randomUUID();
  localStorage.setItem('pdf_magic_session', this.sessionId);
},
```

---

### 6. `serveStatic` — résolution de chemin incorrecte
**Fichier :** `backend/src/index.ts:81-83`

```ts
app.use('/uploads/files/*', serveStaticNode({ 
  root: path.join(process.cwd(), 'uploads') 
}));
```

Hono concatène `root` + le path complet de la requête. Le fichier est cherché à `<cwd>/uploads/uploads/files/<filename>`. La `root` devrait être `process.cwd()` pour que `/uploads/files/<filename>` se résolve correctement.

---

### 7. `GIF`/`WebP` acceptés au stockage mais ignorés à la génération
**Fichiers :** `backend/src/services/storage.service.ts:36-41`, `backend/src/services/pdf.service.ts`

`detectType()` accepte JPEG, PNG (et potentiellement d'autres formats). `PdfService` ne gère que JPEG et PNG — les autres formats passent l'upload et sont silencieusement ignorés lors de la génération PDF. À aligner.

---

### 8. `fetchCurrentFiles()` ne restaure pas l'état
**Fichier :** `frontend/app/pages/index.vue:101-113`

La fonction récupère les IDs depuis le serveur mais ne les injecte pas dans le store. Le backend ne stocke que les IDs, pas les métadonnées (`name`, `type`, `size`). Pour une vraie restauration, le backend doit stocker les `FileInfo` complets ou le frontend doit les persister en localStorage.

---

### 9. Import de type backend→frontend
**Fichier :** `frontend/app/stores/pdf.ts` (si présent)

Un import direct depuis le package backend fonctionnes en dev monorepo mais cassera en production (le frontend n'a pas accès aux sources backend). Les types partagés doivent être dupliqués ou extraits dans un package commun.

---

## Qualité du code

### 10. Deux `index.ts` pour le backend — versions divergentes
`backend/index.ts` (CORS restreint à localhost:3000) et `backend/src/index.ts` (CORS wildcard) sont deux versions du même serveur. Le README pointe sur `src/index.ts`. À consolider en un seul fichier.

### 11. `frontend/index.ts` — fichier placeholder inutile
```ts
console.log("Hello via Bun!");
```
Fichier orphelin sans rapport avec l'app Nuxt. À supprimer.

### 12. `VALID_SESSION_ID_REGEX` trop permissif
**Fichier :** `backend/src/types/index.ts:13`

`/^[0-9a-f-]{36}$/` accepte `------------------------------------`. Un regex UUID strict serait plus sûr :
```ts
/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
```

### 13. `ensureDir()` fire-and-forget dans les constructeurs
`ensureDir()` est appelé dans le constructeur sans `await` (impossible en constructeur). Si une requête arrive avant la fin de la création du répertoire, l'écriture échouera. Le re-appel dans `saveFile()` mitigue partiellement pour le storage, mais pas pour `LocalOrderService`.

### 14. Accès aux champs privés par cast `any` dans les tests
```ts
(storage as any).uploadDir = testDir;
```
Tout renommage interne casse le test sans erreur de compilation. Un paramètre de constructeur serait plus robuste.

### 15. Artefacts Playwright commités
`frontend/playwright-report/` et `frontend/test-results/` sont trackés en git. À ajouter au `.gitignore`.

---

## Points déjà identifiés (revs précédentes)

| Point | Statut |
|---|---|
| `PUT /order` — `fileIds` non validé | Corrigé en rev 2 |
| Race condition dans `addFile()` | Connu, acceptable pour MVP |
| Pas de TTL / nettoyage | Connu, à traiter avant prod |
| `getFile()` O(n) readdir | Connu, non bloquant pour MVP |
| `cors()` toutes origines dans `src/index.ts` | Toujours présent |

---

## Résumé

| Sévérité | Nombre |
|---|---|
| Bloquant (compile/runtime cassé) | 4 |
| Bug notable (comportement incorrect) | 5 |
| Qualité / nettoyage | 6 |
