/** [AI-GENERATED][QA][V280] Prevent failed photo restore from clearing persistent photos. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { shouldPersistRecipePhotos } from '../assets/js/recipe-photo-save-policy.js';

const restored = {
  recipeId: 'recipe-1',
  ownerId: 'owner-A',
  mutationEpochAtStart: 10,
  status: 'restored'
};

test('new recipes may persist the current photo slots without a prior restore', () => {
  assert.deepEqual(shouldPersistRecipePhotos({
    expectedOwnerId: 'owner-A', recipeId: 'recipe-new', editingRecipeId: null,
    restoreOutcome: null, photoMutationEpochAtSave: 0
  }), { allowed: true, reason: 'new-recipe' });
});

test('editing a recipe may replace photos after a successful restore for the same owner', () => {
  assert.deepEqual(shouldPersistRecipePhotos({
    expectedOwnerId: 'owner-A', recipeId: 'recipe-1', editingRecipeId: 'recipe-1',
    restoreOutcome: restored, photoMutationEpochAtSave: 10
  }), { allowed: true, reason: 'restore-confirmed' });
});

test('failed photo restore preserves persisted photos when the user has not changed slots', () => {
  assert.deepEqual(shouldPersistRecipePhotos({
    expectedOwnerId: 'owner-A', recipeId: 'recipe-1', editingRecipeId: 'recipe-1',
    restoreOutcome: { ...restored, status: 'failed' }, photoMutationEpochAtSave: 10
  }), { allowed: false, reason: 'restore-not-confirmed' });
});

test('explicit user photo mutation after a failed restore permits intentional replacement', () => {
  assert.deepEqual(shouldPersistRecipePhotos({
    expectedOwnerId: 'owner-A', recipeId: 'recipe-1', editingRecipeId: 'recipe-1',
    restoreOutcome: { ...restored, status: 'failed' }, photoMutationEpochAtSave: 11
  }), { allowed: true, reason: 'explicit-photo-mutation' });
});

test('photo restore owner mismatch blocks writes unless the current editor has explicitly changed photos', () => {
  assert.equal(shouldPersistRecipePhotos({
    expectedOwnerId: 'owner-B', recipeId: 'recipe-1', editingRecipeId: 'recipe-1',
    restoreOutcome: restored, photoMutationEpochAtSave: 10
  }).allowed, false);
  assert.equal(shouldPersistRecipePhotos({
    expectedOwnerId: 'owner-B', recipeId: 'recipe-1', editingRecipeId: 'recipe-1',
    restoreOutcome: restored, photoMutationEpochAtSave: 11
  }).allowed, true);
});

test('missing restore result and mismatched recipe ID fail closed for existing recipes', () => {
  assert.equal(shouldPersistRecipePhotos({
    expectedOwnerId: 'owner-A', recipeId: 'recipe-1', editingRecipeId: 'recipe-1',
    restoreOutcome: null, photoMutationEpochAtSave: 0
  }).allowed, false);
  assert.equal(shouldPersistRecipePhotos({
    expectedOwnerId: 'owner-A', recipeId: 'recipe-2', editingRecipeId: 'recipe-1',
    restoreOutcome: restored, photoMutationEpochAtSave: 11
  }).allowed, false);
});

test('app-core checks the save policy before replacing IndexedDB photo slots', () => {
  const source = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
  const saveStart = source.indexOf('async function simpanResepKeDatabase() {');
  const saveEnd = source.indexOf('\n\n// ==========================================\n// FUNGSI SINKRONISASI DATA OFFLINE KE SUPABASE', saveStart);
  assert.ok(saveStart >= 0 && saveEnd > saveStart, 'canonical recipe save function must exist');
  const save = source.slice(saveStart, saveEnd);
  assert.match(save, /shouldPersistRecipePhotos\(\{/);
  assert.ok(save.indexOf('if (!photoSavePolicy.allowed)') < save.indexOf('RecipePhotoPersistenceService.replaceRecipePhotos'));
  const restoreStart = source.indexOf('async function restoreRecipePhotosForRecipe(resep) {');
  const restoreEnd = source.indexOf('\nfunction terapkanResepKeKalkulator(resep) {', restoreStart);
  const restore = source.slice(restoreStart, restoreEnd);
  assert.match(restore, /outcome\.status = 'restored'/);
  assert.match(restore, /outcome\.status = 'failed'/);
  assert.match(restore, /outcome\.status = 'stale'/);
});
