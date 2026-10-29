/** [AI-GENERATED][QA][V279] Cached-session identity must not require server getUser verification. */
import test from 'node:test';
import assert from 'node:assert/strict';

let session = { user: { id: 'offline-session-owner' } };
let getSessionCalls = 0;
let getUserCalls = 0;
const mockClient = {
    auth: {
        onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
        async getSession() { getSessionCalls += 1; return { data: { session }, error: null }; },
        async getUser() { getUserCalls += 1; return { data: { user: null }, error: null }; },
        async signOut() { return { error: null }; },
    },
    from() { return {}; },
    async rpc() { return { data: null, error: null }; },
};

globalThis.document = {
    body: { classList: { toggle() {} } },
    getElementById() { return null; },
};
globalThis.localStorage = {
    values: new Map(),
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; },
    setItem(key, value) { this.values.set(key, String(value)); },
    removeItem(key) { this.values.delete(key); },
};
globalThis.window = {
    supabase: { createClient() { return mockClient; } },
    __TPAuthLifecycleHooks: {},
};

const { AuthService } = await import('../assets/js/auth-service.js?test=v279-session-user');

test('getSessionUser reads cached session identity without invoking server-verified getUser', async () => {
    const beforeSession = getSessionCalls;
    const beforeUser = getUserCalls;
    assert.deepEqual(await AuthService.getSessionUser(), { id: 'offline-session-owner' });
    assert.equal(getSessionCalls, beforeSession + 1);
    assert.equal(getUserCalls, beforeUser, 'owner guards should not invoke network-verified getUser');
});

test('getSessionUser returns null for a locally signed-out session', async () => {
    session = null;
    assert.equal(await AuthService.getSessionUser(), null);
    session = { user: { id: 'offline-session-owner' } };
});
