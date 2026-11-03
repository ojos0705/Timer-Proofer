/** [AI-GENERATED][QA][V279] Protect editor-save transactions across account/editor/photo changes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { isRecipeSaveContextCurrent } from '../assets/js/recipe-save-transaction-guard.js';

const context = {
    expectedOwnerId: 'owner-A',
    authenticatedOwnerId: 'owner-A',
    activeOwnerId: 'owner-A',
    capturedEditorEpoch: 4,
    activeEditorEpoch: 4,
    capturedEditingRecipeId: 'recipe-1',
    activeEditingRecipeId: 'recipe-1',
    capturedPhotoMutationEpoch: 8,
    activePhotoMutationEpoch: 8,
    capturedFormFingerprint: '{\"name\":\"Resep QA\",\"yield\":4}',
    activeFormFingerprint: '{\"name\":\"Resep QA\",\"yield\":4}',
};

test('recipe save is allowed only when account, editor, and photo generations match', () => {
    assert.equal(isRecipeSaveContextCurrent(context), true);
});

test('recipe save rejects missing or mismatched authenticated/local owners', () => {
    assert.equal(isRecipeSaveContextCurrent({ ...context, expectedOwnerId: null }), false);
    assert.equal(isRecipeSaveContextCurrent({ ...context, authenticatedOwnerId: 'owner-B' }), false);
    assert.equal(isRecipeSaveContextCurrent({ ...context, activeOwnerId: 'owner-B' }), false);
});

test('late save is rejected after editor navigation, recipe selection, or photo mutation', () => {
    assert.equal(isRecipeSaveContextCurrent({ ...context, activeEditorEpoch: 5 }), false);
    assert.equal(isRecipeSaveContextCurrent({ ...context, activeEditingRecipeId: 'recipe-2' }), false);
    assert.equal(isRecipeSaveContextCurrent({ ...context, activePhotoMutationEpoch: 9 }), false);
    assert.equal(isRecipeSaveContextCurrent({ ...context, activeFormFingerprint: '{\"name\":\"Resep diubah\",\"yield\":4}' }), false);
});

test('save captures context before awaits and pins owner with a precommit validator', () => {
    const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
    const saveStart = appCore.indexOf('async function simpanResepKeDatabase() {');
    const saveEnd = appCore.indexOf('\n\n// ==========================================\n// FUNGSI SINKRONISASI DATA OFFLINE KE SUPABASE', saveStart);
    assert.ok(saveStart >= 0 && saveEnd > saveStart, 'canonical save transaction must exist');
    const save = appCore.slice(saveStart, saveEnd);
    assert.ok(save.indexOf('saveContext = captureRecipeSaveContext()') < save.indexOf('await assertRecipeSaveContextCurrent'));
    assert.match(save, /expectedOwnerId:\s*saveContext\.expectedOwnerId/);
    assert.match(save, /validateBeforeCommit:\s*async\s*\(\)\s*=>\s*\{[\s\S]*?assertRecipeSaveContextCurrent\(saveContext, 'before-local-write'\)/);
    assert.match(save, /recipeFormFingerprint:\s*captureRecipeFormFingerprint\(namaResep\)/);
    assert.match(appCore, /function captureRecipeFormFingerprint\(recipeName\)/);
    assert.match(appCore, /activeFormFingerprint:\s*context\.recipeFormFingerprint == null[\s\S]*?captureRecipeFormFingerprint\(\)/);
    assert.match(save, /catch\s*\(err\)[\s\S]*?RECIPE_OWNER_CHANGED/);

    const storage = fs.readFileSync(new URL('../assets/js/recipe-storage-service.js', import.meta.url), 'utf8');
    const start = storage.indexOf('async function saveRecipeList(recipeList, options = {})');
    const end = storage.indexOf('// [AI-GENERATED][ROBUSTNESS][V276]', start);
    const method = storage.slice(start, end);
    assert.match(method, /hasExplicitOwner/);
    assert.match(method, /await validateBeforeCommit\(\{ ownerId: expectedOwnerId \}\)/);
    assert.match(method, /assertActiveRecipeOwner\(expectedOwnerId, 'Penyimpanan daftar resep'\)/);
});

test('local recipe save uses cached session identity and stays offline-capable', () => {
    const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
    const auth = fs.readFileSync(new URL('../assets/js/auth-service.js', import.meta.url), 'utf8');
    const helperStart = appCore.indexOf('async function inspectRecipeSaveContext(context)');
    const helperEnd = appCore.indexOf('\n}\n\nasync function assertRecipeSaveContextCurrent', helperStart);
    const helper = appCore.slice(helperStart, helperEnd);
    assert.match(helper, /AuthService\.getSessionUser\(\)/);
    assert.match(helper, /else\s*\{\s*owner = await AuthService\.getUser/);
    assert.match(auth, /getSessionUser:\s*async\s*\(\)\s*=>\s*\{\s*const session = await AuthService\.getSession\(\);\s*return session\?\.user \|\| null;/);
});

test('cancelled new-recipe confirmation does not invalidate the active editor epoch', () => {
    const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
    const start = appCore.indexOf('window.buatResepBaruForm = function() {');
    const end = appCore.indexOf('\n};', start);
    const body = appCore.slice(start, end);
    assert.ok(body.indexOf('if (!lanjut) return;') < body.indexOf('markRecipeEditorContextChanged()'));
});
