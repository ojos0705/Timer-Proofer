/** [AI-GENERATED][QA][V254] Account-scoped profile saves must report actual persistence outcomes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const values = new Map();
let blockedKeys = new Set();
globalThis.window = globalThis;
globalThis.Capacitor = { isNativePlatform: () => false };
globalThis.localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
        if (blockedKeys.has(key)) throw new Error(`simulated write failure: ${key}`);
        values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); }
};

const { ProfileService } = await import('../assets/js/profile-service.js');
const appCoreSource = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const start = appCoreSource.indexOf('async function saveProfile() {');
const end = appCoreSource.indexOf('\n}\n', start);
assert.ok(start >= 0 && end > start, 'canonical saveProfile function should exist');
const saveProfileSource = appCoreSource.slice(start, end + 3);

test('profile save succeeds only after every canonical and compatibility key is confirmed', async () => {
    values.clear();
    blockedKeys = new Set();

    await ProfileService.setOwner('profile-test-owner-one');
    const saved = await ProfileService.save({
        name: '  Baker One  ', bakery: ' Oven One ', phone: '+628123', email: 'baker@example.test'
    });

    assert.deepEqual(saved, {
        name: 'Baker One', bakery: 'Oven One', phone: '+628123', email: 'baker@example.test'
    });
    const owner = 'profile-test-owner-one';
    for (const key of ['profile_name', 'profile_bakery', 'profile_phone', 'profile_email', 'user_profile']) {
        assert.ok(values.has(`${key}::${owner}`), `expected scoped ${key} to be persisted`);
    }
    assert.deepEqual(JSON.parse(values.get(`user_profile::${owner}`)), saved);
    assert.equal(values.has('user_profile'), false, 'profile save must not write the global legacy namespace');
});

test('profile save rejects partial persistence and identifies the failed key', async () => {
    values.clear();
    blockedKeys = new Set(['profile_email::profile-test-owner-two']);
    await ProfileService.setOwner('profile-test-owner-two');

    await assert.rejects(ProfileService.save({
        name: 'Baker Two', bakery: 'Oven Two', phone: '+628999', email: 'partial@example.test'
    }), (error) => {
        assert.equal(error.code, 'PROFILE_PERSISTENCE_INCOMPLETE');
        assert.deepEqual(error.failedKeys, ['profile_email::profile-test-owner-two']);
        assert.match(error.message, /Profil belum tersimpan lengkap/);
        return true;
    });
    assert.ok(values.has('user_profile::profile-test-owner-two'), 'remaining writes should still be attempted');
    blockedKeys = new Set();
});

test('profile UI does not announce success or close the edit modal after persistence failure', () => {
    const failureBranch = saveProfileSource.slice(saveProfileSource.indexOf('try {'), saveProfileSource.indexOf('\n    await renderUserProfile();'));
    assert.match(failureBranch, /catch \(error\)/);
    assert.match(failureBranch, /return null/);
    assert.doesNotMatch(failureBranch, /closeEditProfile\(\)/);
    assert.doesNotMatch(failureBranch, /Profil berhasil diperbarui/);
    assert.match(saveProfileSource, /closeEditProfile\(\)/);
    assert.match(saveProfileSource, /Profil berhasil diperbarui/);
});
