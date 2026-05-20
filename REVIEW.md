# Code Review — `pdfmagics`

> Date : 2026-05-20 (rev 2 — état actuel après corrections)

## Vue d'ensemble

Le gros des problèmes bloquants signalés en rev 1 est résolu : le serveur Hono est câblé, la session est générée par UUID côté client, la validation du `sessionId` est en place, la limite de taille de fichier existe, la détection par magic bytes dans `pdf.service.ts` est là. L'architecture tient la route pour un MVP.

Ce qui suit sont les points encore ouverts.

---

## Backend

### `backend/index.ts` (racine)
Toujours `console.log("Hello via Bun!")`. La racine est ignorée en pratique (le README pointe vers `src/index.ts`) mais c'est trompeur. À supprimer ou à rediriger.

### Adapter Node au lieu de Bun (`src/index.ts`)
```ts
import { serveStatic as serveStaticNode } from '@hono/node-server/serve-static';
import { serve } from '@hono/node-server';
```
Le CLAUDE.md demande `Bun.serve()`. Le serveur tourne via `@hono/node-server` et `node:fs/promises` est utilisé partout dans les services. Ce n'est pas bloquant pour un MVP local mais c'est en contradiction avec le setup décidé.

### `PUT /order` — `fileIds` non validé
Le `sessionId` est bien validé mais `fileIds` n'est pas vérifié : pas de contrôle que c'est un tableau, ni que les entrées sont des UUIDs valides. Un payload malformé (`fileIds: "foo"`) passe sans erreur.

### `storage.service.ts` — O(n) sur chaque lookup
`getFile()` et `deleteFile()` font un `readdir()` complet pour retrouver un fichier par préfixe UUID. Stocker le chemin complet dans `FileInfo.url` (déjà présent) et le réutiliser résoudrait ça sans changement d'interface.

### `storage.service.ts` / `order.service.ts` — magic bytes vs formats supportés
`detectType()` accepte JPEG, PNG, GIF, WebP, PDF. Mais `pdf.service.ts` ne gère que JPEG et PNG parmi les images — GIF et WebP passent le filtre d'upload et sont silencieusement ignorés lors de la génération. À aligner : soit `detectType` restreint aux formats réellement gérés, soit `pdf.service` les traite.

### `order.service.ts` — race condition dans `addFile()`
Lecture puis écriture non atomiques. Deux uploads simultanés sur la même session peuvent causer une perte de mise à jour. Acceptable pour MVP monoutilisateur, à noter pour la migration KV (qui aura des primitives atomiques).

### Pas de TTL ni de nettoyage
Les fichiers uploadés et les sessions JSON s'accumulent indéfiniment. À traiter avant prod.

### `cors()` sans restriction d'origine
Toutes les origines sont acceptées. À restreindre avant prod.

---

## Frontend

### `<script setup>` sans `lang="ts"` (`index.vue`)
Le composant principal n'a pas TypeScript actif malgré un projet TS.

### Import cross-boundary dans le store
```ts
// stores/pdf.ts
import type { FileInfo } from '../../../backend/src/types/index';
```
Ça fonctionne en dev monorepo mais cassera en prod (le frontend ne verra pas le backend). Dupliquer ou extraire le type dans un package partagé.

### `fetchCurrentFiles()` vide
La session est bien restaurée depuis `localStorage` au montage, mais les fichiers ne sont jamais rechargés depuis le backend. L'utilisateur repart d'une liste vide à chaque refresh même si des fichiers existent côté serveur.

### Erreurs API peu informatives (`useApi.ts`)
```ts
throw new Error(`Upload failed: ${res.statusText}`);
```
`statusText` est souvent vide (Cloudflare, Nginx, Bun). Préférer `res.json()` pour récupérer le message d'erreur retourné par le serveur.

---

## Tests

### `pdf.test.ts` — `require()` dans un contexte ESM
```ts
if (!require('fs').existsSync(testDir)) {
```
Mélange CommonJS dans un projet ESM. Utiliser `import { existsSync } from 'node:fs'`.

### `pdf.test.ts` — `rmDirSync` déprécié
`rmDirSync` est déprécié. Utiliser `rmSync(testDir, { recursive: true })`.

### `pdf.test.ts` — pas de nettoyage après les tests
Les fichiers créés dans `tests/temp_uploads/` persistent après l'exécution. Ajouter un `afterEach` ou `afterAll`.

### `pdf.test.ts` — contournement de l'encapsulation
```ts
(storage as any).uploadDir = testDir;
```
Fragile : tout renommage interne casse le test sans erreur de compilation.

### `integration.test.ts` — écrit dans `uploads/` de prod
Les tests d'intégration utilisent le répertoire réel, pas un répertoire isolé. Ils polluent l'état de dev et peuvent interférer avec un serveur tournant localement.

---

## Résumé

| Priorité | Problème |
|----------|----------|
| Haute    | GIF/WebP acceptés au stockage mais silencieusement ignorés à la génération |
| Haute    | `fetchCurrentFiles()` vide — état non restauré au refresh |
| Haute    | Import type backend→frontend — cassera en prod |
| Moyenne  | `fileIds` non validé sur `PUT /order` |
| Moyenne  | `require()` dans les tests ESM |
| Moyenne  | Tests d'intégration polluent `uploads/` |
| Basse    | `readdir()` O(n) sur chaque lookup |
| Basse    | Pas de TTL / nettoyage |
| Basse    | `cors()` toutes origines |
| Basse    | `backend/index.ts` racine obsolète |
