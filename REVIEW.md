# Code Review — `francklebas/pdfmagics`

> Date : 2026-05-20

## Vue d'ensemble

Projet MVP de compositeur de PDF (upload images/PDFs, réordonnancement, génération).
Stack : **Bun + Hono + pdf-lib** (backend), **Nuxt 4 + Pinia + Tailwind** (frontend).

L'architecture est bien pensée : les interfaces `IStorageService` / `IOrderService` permettront une migration propre vers Cloudflare R2/KV. Mais plusieurs bugs et problèmes de sécurité bloquants sont présents.

---

## Problème critique : le backend ne démarre pas

`backend/index.ts` ne contient que `console.log("Hello via Bun!")`. Le serveur Hono n'est jamais instancié, aucune route n'est définie. Les services existent mais ne sont branchés sur aucune couche HTTP. Le frontend appelle `/upload`, `/files`, `/order`, `/generate` dans le vide.

---

## Sécurité

### Path traversal (critique)

```ts
// order.service.ts
private getStatePath(sessionId: string) {
  return path.join(this.stateDir, `${sessionId}.json`);
}
```

Si `sessionId = '../etc/passwd'`, le chemin s'échappe du répertoire. Même problème dans `storage.service.ts`. Ajouter une validation stricte (UUID v4 uniquement, ex. `/^[0-9a-f-]{36}$/`).

### Session hardcodée

```ts
// stores/pdf.ts
sessionId: 'session-123', // In real app, generate this
```

Tous les utilisateurs partagent la même session — ils voient et écrasent les fichiers des autres. Remplacer par `crypto.randomUUID()` persisté en `localStorage`.

### Aucune validation MIME côté serveur

Le type de fichier est déterminé uniquement par `file.type` (fourni par le navigateur, trivialement falsifiable). Un attaquant peut uploader n'importe quel fichier en falsifiant le Content-Type.

### Mélange état/fichiers dans le même dossier

Les `.json` de session et les binaires uploadés cohabitent dans `uploads/`. Si les fichiers statiques sont servis directement, `/uploads/session-123.json` expose l'état de session complet d'un utilisateur.

---

## Backend

### `storage.service.ts`

- `getFile()` et `deleteFile()` font un `readdir()` complet à chaque appel pour trouver un fichier par préfixe — O(n) sur le nombre de fichiers. Stocker le chemin complet dans `FileInfo` résoudrait ça.
- Le répertoire `uploads/` n'est jamais créé (le constructeur renvoie vers l'index, mais l'index est vide).
- Aucune limite de taille de fichier.
- Aucun TTL / nettoyage des fichiers uploadés.

### `order.service.ts`

- Race condition dans `addFile()` : lecture puis écriture non atomiques. Deux requêtes simultanées peuvent causer une perte de mise à jour.
- Le `catch {}` silencieux dans `getOrder()` masque aussi les erreurs de JSON corrompu.

### `pdf.service.ts`

- La détection JPG/PNG par try/catch est un anti-pattern de contrôle de flux. Vérifier les magic bytes directement (`\xFF\xD8\xFF` pour JPEG, `\x89PNG` pour PNG).
- Si le fichier n'est ni JPG ni PNG, le second `embedPng` lève une exception non gérée — la génération plante silencieusement.
- Traitement séquentiel des fichiers : `Promise.all` améliorerait les performances (avec attention à la mémoire si nombreux PDFs lourds).

---

## Frontend

### `pages/index.vue`

- `<script setup>` sans `lang="ts"` — pas de TypeScript dans le composant principal.

- `handleDrop` utilise `.forEach(async ...)` : les erreurs sont avalées silencieusement et les uploads s'exécutent en parallèle non contrôlé.

```ts
// Problème
Array.from(files).forEach(async (file) => { ... });

// Correct
for (const file of Array.from(files)) {
  await uploadFile(file, store.sessionId);
}
```

- `removeFile` mute le store directement via `store.files.splice(index, 1)` au lieu d'utiliser une action Pinia — brise le flux unidirectionnel.
- `window.location.href = url` pour le téléchargement provoque une navigation complète. Préférer un `<a download>` ou `window.open(url, '_blank')`.
- `store.isUploading` est dans le store mais jamais mis à `true/false` — l'indicateur de chargement ne fonctionne pas.
- L'`<input type="file">` n'a pas d'attribut `accept="image/*,.pdf"` — aucun filtre côté UI.
- Aucune gestion d'erreur si l'upload échoue.

### `composables/useApi.ts`

- `baseUrl = 'http://localhost:3001'` hardcodé — doit passer par `useRuntimeConfig()` de Nuxt pour être configurable par environnement.
- Aucune gestion d'erreur : si le serveur retourne une 4xx/5xx, `res.json()` peut lever ou retourner un objet erreur non vérifié par l'appelant.

### `stores/pdf.ts`

- `files: [] as any[]` — doit être typé `FileInfo[]` (l'interface existe déjà dans `backend/src/types/index.ts`, à partager ou dupliquer côté frontend).
- Pas d'action `removeFile` dans le store alors que c'est une opération métier qui mute l'état.

---

## Tests

Aucun test présent. Priorités recommandées :

- `PdfService.generatePdf()` — cas mixtes PDF + image, fichier corrompu, liste vide.
- `LocalOrderService.addFile()` — vérifier le comportement sous concurrence.
- `LocalStorageService.saveFile()` — validation du type, limites de taille.

---

## Résumé des priorités

| Priorité | Problème |
|----------|----------|
| Bloquant | `index.ts` vide — le serveur HTTP n'existe pas |
| Critique | Path traversal sur `sessionId` non validé |
| Critique | Session hardcodée `'session-123'` partagée entre tous |
| Haute    | Validation MIME côté serveur absente |
| Haute    | `forEach(async)` dans `handleDrop` |
| Haute    | `baseUrl` hardcodé en localhost |
| Moyenne  | Race condition dans `addFile` |
| Moyenne  | Typage `any[]` dans le store |
| Moyenne  | `isUploading` jamais togglé |
| Basse    | `readdir()` O(n) sur chaque lookup de fichier |
