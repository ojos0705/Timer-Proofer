/** [AI-GENERATED][QA][V257] Verify the ESM SDK bridge and retry behavior. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeSupabaseSdkBridge } from '../assets/js/supabase-runtime.js';

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

test('an already initialized Supabase client is preserved without loading the SDK again', async () => {
    const client = { auth: {}, from() {} };
    const target = { supabase: client };
    let loads = 0;

    const result = await initializeSupabaseSdkBridge({
        target,
        loadSdk: async () => { loads += 1; throw new Error('should not load'); }
    });

    assert.equal(result.status, 'client-ready');
    assert.strictEqual(result.client, client);
    assert.strictEqual(target.supabase, client);
    assert.equal(loads, 0);
});

test('concurrent SDK initialization shares one load and installs the createClient bridge', async () => {
    const target = {};
    const gate = deferred();
    const createClient = () => ({ auth: {}, from() {} });
    let loads = 0;
    const loadSdk = () => { loads += 1; return gate.promise; };

    const first = initializeSupabaseSdkBridge({ target, loadSdk });
    const second = initializeSupabaseSdkBridge({ target, loadSdk });
    await Promise.resolve();
    assert.equal(loads, 1);

    gate.resolve({ createClient });
    const [firstResult, secondResult] = await Promise.all([first, second]);
    assert.equal(firstResult.status, 'bridge-ready');
    assert.strictEqual(target.supabase.createClient, createClient);
    assert.strictEqual(firstResult.createClient, createClient);
    assert.strictEqual(secondResult.createClient, createClient);
});

test('a failed SDK load releases its guard so a later auth attempt can retry', async () => {
    const target = {};
    const createClient = () => ({ auth: {}, from() {} });
    let loads = 0;

    await assert.rejects(initializeSupabaseSdkBridge({
        target,
        loadSdk: async () => { loads += 1; throw new Error('offline'); }
    }), /offline/);
    assert.equal(target.supabase, undefined);

    const result = await initializeSupabaseSdkBridge({
        target,
        loadSdk: async () => { loads += 1; return { createClient }; }
    });
    assert.equal(loads, 2);
    assert.equal(result.status, 'bridge-ready');
    assert.strictEqual(target.supabase.createClient, createClient);
});

test('an invalid module export is rejected without leaving a poisoned retry guard', async () => {
    const target = {};
    await assert.rejects(initializeSupabaseSdkBridge({ target, loadSdk: async () => ({ default: {} }) }), /tidak mengekspor createClient/);
    const createClient = () => ({ auth: {}, from() {} });
    const result = await initializeSupabaseSdkBridge({ target, loadSdk: async () => ({ createClient }) });
    assert.equal(result.status, 'bridge-ready');
});

test('a client installed during an SDK load wins over the arriving factory namespace', async () => {
    const target = {};
    const gate = deferred();
    const lateClient = { auth: {}, from() {} };
    const pending = initializeSupabaseSdkBridge({ target, loadSdk: () => gate.promise });
    await Promise.resolve();
    target.supabase = lateClient;
    gate.resolve({ createClient() { throw new Error('must not replace client'); } });

    const result = await pending;
    assert.equal(result.status, 'client-ready');
    assert.strictEqual(result.client, lateClient);
    assert.strictEqual(target.supabase, lateClient);
});
