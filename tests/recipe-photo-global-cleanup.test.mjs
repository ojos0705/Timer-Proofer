import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('RecipePhotoService remains a named ESM export without an unused object global', () => {
  const source = read('assets/js/recipe-photo-service.js');
  assert.match(source, /export\s*\{[^}]*\bRecipePhotoService\b/s);
  assert.doesNotMatch(source, /window\.RecipePhotoService\s*=/);
  assert.match(source, /window\.uploadedRecipeFiles\s*=/);
  assert.match(source, /window\.triggerPhotoInput\s*=/);
  assert.match(source, /window\.removeRecipePhoto\s*=/);
});

test('RecipePhotoPersistenceService remains a named ESM export without a window alias', () => {
  const source = read('assets/js/recipe-photo-persistence-service.js');
  assert.match(source, /export\s+const\s+RecipePhotoPersistenceService\s*=/);
  assert.doesNotMatch(source, /window\.RecipePhotoPersistenceService\s*=/);
});

test('photo service consumers bind dependencies through named ESM imports', () => {
  const appCore = read('assets/js/app-core.js');
  const delegation = read('assets/js/core/event-delegation.js');
  assert.match(appCore, /import\s+\{[^}]*\bRecipePhotoService\b[^}]*\}\s+from\s+["']\.\/recipe-photo-service\.js["']/);
  assert.match(appCore, /import\s+\{\s*RecipePhotoPersistenceService\s*\}\s+from\s+["']\.\/recipe-photo-persistence-service\.js["']/);
  assert.match(delegation, /import\s+\{\s*RecipePhotoService\s*\}\s+from\s+["']\.\.\/recipe-photo-service\.js["']/);
  assert.doesNotMatch(appCore + delegation, /window\.RecipePhoto(?:Persistence)?Service/);
});

test('release verifier prevents unused photo service aliases from returning', () => {
  const verifier = read('scripts/verify-release.mjs');
  assert.match(verifier, /V285[\s\S]*RecipePhotoService/);
  assert.match(verifier, /RecipePhotoPersistenceService/);
  assert.match(verifier, /window\.triggerPhotoInput/);
});
