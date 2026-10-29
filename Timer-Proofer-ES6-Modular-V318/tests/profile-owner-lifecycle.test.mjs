/** [AI-GENERATED][QA][V254] Profile namespace owner is aligned with auth lifecycle and destructive cleanup. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const signedInStart = appCore.indexOf('onSignedIn: async (session, epoch) => {');
const signedOutStart = appCore.indexOf('onSignedOut: async (epoch) => {', signedInStart);
const signedInBlock = appCore.slice(signedInStart, signedOutStart);
const signedOutEnd = appCore.indexOf('\n    }\n};', signedOutStart);
const signedOutBlock = appCore.slice(signedOutStart, signedOutEnd);
const accountDeleteStart = appCore.indexOf('async function hapusAkunPermanen() {');
const accountDeleteEnd = appCore.indexOf('\n}\n', accountDeleteStart);
const accountDeleteBlock = appCore.slice(accountDeleteStart, accountDeleteEnd + 3);

test('authenticated profile owner is established before app initialization', () => {
    assert.ok(signedInStart >= 0 && signedOutStart > signedInStart);
    assert.match(signedInBlock, /ProfileDataService\.setOwner\(session\.user\.id\)/);
    assert.ok(signedInBlock.indexOf('ProfileDataService.setOwner') < signedInBlock.indexOf('initApp()'));
});

test('signed-out lifecycle seals the prior profile namespace', () => {
    assert.ok(signedOutStart >= 0 && signedOutEnd > signedOutStart);
    assert.match(signedOutBlock, /ProfileDataService\.clearOwner\(\)/);
    assert.ok(signedOutBlock.indexOf('if (!isCurrent()) return;') < signedOutBlock.indexOf('ProfileDataService.clearOwner()'));
    assert.ok(signedOutBlock.indexOf('ProfileDataService.clearOwner()') < signedOutBlock.indexOf('await stopSupabaseRealtime()'),
        'profile owner should be cleared before the first awaited cleanup');
});

test('permanent account deletion seals profile owner even when auth sign-out fails', () => {
    assert.ok(accountDeleteStart >= 0 && accountDeleteEnd > accountDeleteStart);
    assert.match(accountDeleteBlock, /ProfileDataService\.clearOwner\(\)/);
    assert.match(accountDeleteBlock, /RecipeStorageService\.clearOwner\(\)/);
});

test('late profile load/save results cannot overwrite the UI after owner changes', () => {
    const dynamicStart = appCore.indexOf('async function loadDynamicProfile(showNotifications = false) {');
    const dynamicEnd = appCore.indexOf('\n}\n', dynamicStart);
    const dynamicBlock = appCore.slice(dynamicStart, dynamicEnd + 3);
    const saveStart = appCore.indexOf('async function saveProfile() {');
    const saveEnd = appCore.indexOf('\n}\n', saveStart);
    const saveBlock = appCore.slice(saveStart, saveEnd + 3);

    assert.match(dynamicBlock, /profileLoadGeneration/);
    assert.match(dynamicBlock, /isCurrentProfileLoad\(\)/);
    assert.match(dynamicBlock, /loadGeneration === profileLoadGeneration/);
    assert.match(saveBlock, /isSameProfileOwner\(\)/);
    assert.ok(saveBlock.indexOf('if (!isSameProfileOwner()) return null;') < saveBlock.indexOf('closeEditProfile()'));
});
