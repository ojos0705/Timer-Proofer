/** [AI-GENERATED][QA][V206] Regression tests for the canonical auth/logout lifecycle. */
import test from 'node:test';
import assert from 'node:assert/strict';

let authStateCallback;
let signOutCalls = 0;
let signOutImplementation = async () => ({ error: null });

const mockClient = {
    auth: {
        onAuthStateChange(callback) {
            authStateCallback = callback;
            return { data: { subscription: { unsubscribe() {} } } };
        },
        signOut(...args) {
            signOutCalls += 1;
            return signOutImplementation(...args);
        },
        async getSession() { return { data: { session: null }, error: null }; },
        async getUser() { return { data: { user: null }, error: null }; },
    },
    from() { return {}; },
    async rpc() { return { data: null, error: null }; },
};

const toggledClasses = [];
globalThis.document = {
    body: { classList: { toggle(name, value) { toggledClasses.push([name, value]); } } },
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

const { AuthService } = await import('../assets/js/auth-service.js');

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

function delay(ms = 10) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

test('concurrent logout callers share one stable signOut promise and one SDK call', async () => {
    const gate = deferred();
    signOutImplementation = () => gate.promise;
    const callsBefore = signOutCalls;

    const first = AuthService.signOut();
    const second = AuthService.signOut();
    const third = AuthService.signOut();

    assert.strictEqual(first, second, 'caller two should receive the existing promise');
    assert.strictEqual(first, third, 'caller three should receive the existing promise');
    assert.equal(signOutCalls - callsBefore, 1, 'the SDK should receive one signOut call');

    gate.resolve({ error: null });
    assert.equal(await first, true);

    signOutImplementation = async () => ({ error: null });
    assert.equal(await AuthService.signOut(), true, 'a later logout should start after settlement');
    assert.equal(signOutCalls - callsBefore, 2);
});

test('a failed logout releases the guard so the user can retry', async () => {
    const callsBefore = signOutCalls;
    signOutImplementation = async () => ({ error: new Error('temporary sign-out failure') });

    await assert.rejects(AuthService.signOut(), /temporary sign-out failure/);
    assert.equal(signOutCalls - callsBefore, 1);

    signOutImplementation = async () => ({ error: null });
    assert.equal(await AuthService.signOut(), true);
    assert.equal(signOutCalls - callsBefore, 2);
});

test('a queued SIGNED_IN event cannot start stale lifecycle hooks after logout begins', async () => {
    assert.equal(typeof authStateCallback, 'function', 'auth listener should be bound during initialization');
    const callsBefore = signOutCalls;
    const signOutGate = deferred();
    signOutImplementation = () => signOutGate.promise;
    let signedInHookCalls = 0;
    window.__TPAuthLifecycleHooks = {
        onSignedIn() { signedInHookCalls += 1; },
    };

    authStateCallback('SIGNED_IN', { user: { id: 'qa-user-v206' } });
    const logout = AuthService.signOut();
    await delay(20);

    assert.equal(signedInHookCalls, 0, 'stale event must be ignored before side effects');
    assert.equal(signOutCalls - callsBefore, 1);

    signOutGate.resolve({ error: null });
    assert.equal(await logout, true);
    window.__TPAuthLifecycleHooks = {};
});
