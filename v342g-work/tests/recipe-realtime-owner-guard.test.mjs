/** [AI-GENERATED][QA][V278] Guards realtime recipe events across auth/local-owner races. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { isRecipeRealtimeOwnerConsistent } from '../assets/js/recipe-realtime-owner-guard.js';

const matching = {
    eventOwnerId: 'owner-A',
    authenticatedOwnerId: 'owner-A',
    localOwnerId: 'owner-A',
    expectedLocalOwnerId: 'owner-A'
};

test('realtime recipe event is accepted only when event, auth, and local namespace owner match', () => {
    assert.equal(isRecipeRealtimeOwnerConsistent(matching), true);
    assert.equal(isRecipeRealtimeOwnerConsistent({ ...matching, eventOwnerId: 17, authenticatedOwnerId: '17', localOwnerId: 17, expectedLocalOwnerId: '17' }), true);
});

test('realtime recipe guard rejects unauthenticated, ownerless, or mismatched sessions', () => {
    assert.equal(isRecipeRealtimeOwnerConsistent({ ...matching, authenticatedOwnerId: null }), false);
    assert.equal(isRecipeRealtimeOwnerConsistent({ ...matching, eventOwnerId: null }), false);
    assert.equal(isRecipeRealtimeOwnerConsistent({ ...matching, localOwnerId: null }), false);
    assert.equal(isRecipeRealtimeOwnerConsistent({ ...matching, expectedLocalOwnerId: null }), false);
    assert.equal(isRecipeRealtimeOwnerConsistent({ ...matching, authenticatedOwnerId: 'owner-B' }), false);
    assert.equal(isRecipeRealtimeOwnerConsistent({ ...matching, localOwnerId: 'owner-B' }), false);
    assert.equal(isRecipeRealtimeOwnerConsistent({ ...matching, expectedLocalOwnerId: 'owner-B' }), false);
});

test('realtime handler captures local namespace before auth await and revalidates after reads and writes', () => {
    const source = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
    const start = source.indexOf('async function tanganiPerubahanResepRealtime(payload) {');
    const end = source.indexOf('\n}\n\n// ==========================================\n// 4. FUNGSI PIP', start);
    assert.ok(start >= 0 && end > start, 'canonical realtime recipe handler must exist');
    const body = source.slice(start, end);

    assert.match(source, /import \{ isRecipeRealtimeOwnerConsistent \} from '\.\/recipe-realtime-owner-guard\.js'/);
    const captureIndex = body.indexOf('const expectedLocalOwnerId = RecipeStorageService.getActiveOwnerId?.() ?? null');
    const firstAuthIndex = body.indexOf('const activeOwner = await AuthService.getUser?.()');
    assert.ok(captureIndex >= 0 && firstAuthIndex > captureIndex, 'local owner must be captured before the first async auth read');
    assert.match(body, /isRecipeRealtimeOwnerConsistent\(\{[\s\S]*eventOwnerId,[\s\S]*authenticatedOwnerId: activeOwner\?\.id,[\s\S]*expectedLocalOwnerId/);

    const localReadIndex = body.indexOf('await bacaSemuaResepDariPerangkat()');
    const afterReadGuardIndex = body.indexOf('const ownerAfterRead = await AuthService.getUser?.()');
    const saveIndex = body.indexOf('await simpanDaftarResepKePerangkat(resepLokal)');
    const postSaveOwnerIndex = body.indexOf('const ownerAfterCommit = await AuthService.getUser?.()');
    const publishIndex = body.indexOf('window.recipes = resepLokal');
    assert.ok(localReadIndex >= 0 && afterReadGuardIndex > localReadIndex, 'owner state must be revalidated after local recipe read');
    assert.ok(saveIndex > afterReadGuardIndex, 'the local owner guard must run before local commit');
    assert.ok(postSaveOwnerIndex > saveIndex, 'owner state must be revalidated after the async local write');
    assert.ok(publishIndex > postSaveOwnerIndex, 'global UI state must not be published before post-write owner validation');
    assert.ok((body.match(/isRecipeRealtimeOwnerConsistent\(/g) || []).length >= 5, 'owner guard must cover each async event boundary');
});
