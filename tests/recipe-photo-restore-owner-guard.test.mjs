/** [AI-GENERATED][QA][V277] Owner and generation guards for async photo restoration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { isRecipePhotoRestoreCurrent } from '../assets/js/recipe-photo-restore-guard.js';

const current = {
    capturedOwnerId: 'owner-A',
    activeOwnerId: 'owner-A',
    capturedRestoreEpoch: 7,
    activeRestoreEpoch: 7,
    capturedMutationEpoch: 12,
    activeMutationEpoch: 12
};

test('photo restore may apply only while owner and generations remain unchanged', () => {
    assert.equal(isRecipePhotoRestoreCurrent(current), true);
});

test('late photos from owner A are rejected after the active account changes to owner B', () => {
    assert.equal(isRecipePhotoRestoreCurrent({ ...current, activeOwnerId: 'owner-B' }), false);
});

test('photo restore fails closed when either owner identity is absent', () => {
    assert.equal(isRecipePhotoRestoreCurrent({ ...current, activeOwnerId: null }), false);
    assert.equal(isRecipePhotoRestoreCurrent({ ...current, capturedOwnerId: '' }), false);
});

test('late photo restore is rejected after recipe navigation invalidates its epoch', () => {
    assert.equal(isRecipePhotoRestoreCurrent({ ...current, activeRestoreEpoch: 8 }), false);
});

test('late photo restore is rejected after a user photo mutation', () => {
    assert.equal(isRecipePhotoRestoreCurrent({ ...current, activeMutationEpoch: 13 }), false);
});

test('app-core revalidates the authenticated owner after IndexedDB load and before rendering photos', () => {
    const source = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
    const start = source.indexOf('async function restoreRecipePhotosForRecipe(');
    const end = source.indexOf('\nfunction terapkanResepKeKalkulator(', start);
    assert.ok(start >= 0 && end > start, 'canonical recipe photo restore function must exist');
    const body = source.slice(start, end);
    assert.match(body, /const slotFiles = await RecipePhotoPersistenceService\.loadRecipePhotos\(ownerId, resep\.id\)/);
    assert.match(body, /const activeOwner = await AuthService\.getUser\?\.\(\)/);
    assert.match(body, /isRecipePhotoRestoreCurrent\(\{[\s\S]*capturedOwnerId:\s*ownerId,[\s\S]*activeOwnerId:\s*activeOwner\?\.id,[\s\S]*capturedRestoreEpoch:\s*epoch,[\s\S]*capturedMutationEpoch:\s*mutationEpoch/);
    assert.ok(body.indexOf('isRecipePhotoRestoreCurrent(') < body.indexOf('RecipePhotoService.restoreFiles(slotFiles)'),
        'owner/generation validation must complete before the restored photo blobs reach the UI');
});
