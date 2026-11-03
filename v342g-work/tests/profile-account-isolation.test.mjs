/** [AI-GENERATED][QA][V254] Profile persistence must never cross authenticated owners. */
import test from 'node:test';
import assert from 'node:assert/strict';

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

function profile(name, bakery) {
    return { name, bakery, phone: '-', email: `${name.toLowerCase().replaceAll(' ', '.')}@example.test` };
}

test('profile values stay isolated when two accounts use the same device', async () => {
    values.clear();
    blockedKeys = new Set();

    await ProfileService.setOwner('acct-a');
    await ProfileService.save(profile('Baker A', 'Oven A'));
    ProfileService.clearOwner();

    await ProfileService.setOwner('acct-b');
    assert.deepEqual(await ProfileService.load(), ProfileService.defaults);
    await ProfileService.save(profile('Baker B', 'Oven B'));
    ProfileService.clearOwner();

    await ProfileService.setOwner('acct-a');
    assert.deepEqual(await ProfileService.load(), profile('Baker A', 'Oven A'));
    ProfileService.clearOwner();

    await ProfileService.setOwner('acct-b');
    assert.deepEqual(await ProfileService.load(), profile('Baker B', 'Oven B'));
    assert.equal(values.has('user_profile'), false, 'no account should write profile data to the unscoped key');
});

test('legacy profile is claimed by one owner and never inherited by a second account', async () => {
    values.clear();
    blockedKeys = new Set();
    values.set('profile_name', 'Legacy Baker');
    values.set('profile_bakery', 'Legacy Oven');
    values.set('profile_phone', '+628111');
    values.set('profile_email', 'legacy@example.test');
    values.set('user_profile', JSON.stringify({
        name: 'Legacy Baker', bakery: 'Legacy Oven', phone: '+628111', email: 'legacy@example.test'
    }));

    assert.equal(await ProfileService.setOwner('legacy-owner-a'), true);
    assert.deepEqual(await ProfileService.load(), {
        name: 'Legacy Baker', bakery: 'Legacy Oven', phone: '+628111', email: 'legacy@example.test'
    });
    assert.equal(values.get(ProfileService.migrationMarkerKey), 'legacy-owner-a');
    assert.equal(values.has('user_profile'), false, 'legacy global key should be removed after successful migration');
    ProfileService.clearOwner();

    assert.equal(await ProfileService.setOwner('legacy-owner-b'), true);
    assert.deepEqual(await ProfileService.load(), ProfileService.defaults);
});

test('an interrupted legacy migration remains sealed to its original owner and can be retried', async () => {
    values.clear();
    blockedKeys = new Set();
    values.set('profile_name', 'Retry Baker');
    values.set('user_profile', JSON.stringify({ name: 'Retry Baker', bakery: 'Retry Oven' }));
    blockedKeys = new Set(['profile_name::retry-owner-a']);

    assert.equal(await ProfileService.setOwner('retry-owner-a'), false);
    assert.equal(values.get(ProfileService.migrationMarkerKey), 'retry-owner-a');
    ProfileService.clearOwner();

    blockedKeys = new Set();
    assert.equal(await ProfileService.setOwner('retry-owner-b'), true);
    assert.deepEqual(await ProfileService.load(), ProfileService.defaults);
    ProfileService.clearOwner();

    assert.equal(await ProfileService.setOwner('retry-owner-a'), true);
    assert.equal((await ProfileService.load()).name, 'Retry Baker');
    assert.equal(values.has('user_profile'), false);
});

test('clearing a scoped profile does not delete another owner’s legacy migration data', async () => {
    values.clear();
    blockedKeys = new Set();
    values.set(ProfileService.migrationMarkerKey, 'legacy-owner-a');
    values.set('profile_name', 'A legacy data');

    await ProfileService.setOwner('owner-b');
    assert.equal(await ProfileService.clear(), true);
    assert.equal(values.get('profile_name'), 'A legacy data');
});

test('profile service fails closed when used without an authenticated owner', async () => {
    ProfileService.clearOwner();
    assert.deepEqual(await ProfileService.load(), ProfileService.defaults);
    await assert.rejects(ProfileService.save(profile('No Owner', 'No Oven')), (error) => {
        assert.equal(error.code, 'PROFILE_OWNER_REQUIRED');
        return true;
    });
});
