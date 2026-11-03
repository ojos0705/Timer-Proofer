/** [AI-GENERATED][QA][V259] Verify lazy, retryable Midtrans Snap loading behind an ES6 Module adapter. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadMidtransSnap, isMidtransConfigured, resetMidtransRuntimeForTests } from '../assets/js/midtrans-runtime.js';

function makeHarness({ clientKey = 'SB-Mid-client-test-key', environment = 'sandbox', onAppend = null } = {}) {
    const inserted = [];
    const config = {
        dataset: { clientKey, environment },
        getAttribute(name) {
            if (name === 'data-client-key') return this.dataset.clientKey;
            if (name === 'data-environment') return this.dataset.environment;
            return null;
        }
    };
    const documentRef = {
        head: {
            appendChild(script) {
                inserted.push(script);
                script.parentNode = this;
                script.remove = () => {
                    const index = inserted.indexOf(script);
                    if (index >= 0) inserted.splice(index, 1);
                };
                onAppend?.(script, windowRef, documentRef);
                return script;
            },
            removeChild(script) {
                const index = inserted.indexOf(script);
                if (index >= 0) inserted.splice(index, 1);
                script.parentNode = null;
            }
        },
        querySelector(selector) {
            if (selector === 'meta[name="midtrans-snap-config"]') return config;
            const match = selector.match(/^script\[data-tp-runtime="([^"]+)"\]$/);
            return match ? inserted.find((script) => script.dataset.tpRuntime === match[1]) || null : null;
        },
        createElement(tag) {
            const listeners = new Map();
            return {
                tagName: tag.toUpperCase(),
                dataset: {},
                attributes: {},
                addEventListener(name, callback) {
                    const callbacks = listeners.get(name) || [];
                    callbacks.push(callback);
                    listeners.set(name, callbacks);
                },
                removeEventListener(name, callback) {
                    listeners.set(name, (listeners.get(name) || []).filter((item) => item !== callback));
                },
                setAttribute(name, value) { this.attributes[name] = String(value); },
                dispatch(name) { for (const callback of listeners.get(name) || []) callback({ type: name }); }
            };
        }
    };
    const windowRef = {};
    return { documentRef, windowRef, inserted, config };
}

test('placeholder Client Key is rejected before inserting any SDK script', async () => {
    resetMidtransRuntimeForTests();
    const harness = makeHarness({ clientKey: 'YOUR_CLIENT_KEY' });
    assert.equal(isMidtransConfigured({ documentRef: harness.documentRef }), false);
    await assert.rejects(loadMidtransSnap(harness), { code: 'MIDTRANS_CONFIG_MISSING' });
    assert.equal(harness.inserted.length, 0);
});

test('concurrent checkout requests share one SDK load and use the public Client Key attribute', async () => {
    resetMidtransRuntimeForTests();
    let appendCount = 0;
    const harness = makeHarness({
        onAppend(script, windowRef) {
            appendCount += 1;
            queueMicrotask(() => {
                windowRef.snap = { pay(token) { assert.equal(token, 'test-token'); } };
                script.dispatch('load');
            });
        }
    });
    assert.equal(isMidtransConfigured({ documentRef: harness.documentRef }), true);
    const first = loadMidtransSnap(harness);
    const second = loadMidtransSnap(harness);
    assert.equal(first, second);
    const snap = await first;
    assert.equal(typeof snap.pay, 'function');
    assert.equal(appendCount, 1);
    assert.equal(harness.inserted[0].src, 'https://app.sandbox.midtrans.com/snap/snap.js');
    assert.equal(harness.inserted[0].attributes['data-client-key'], 'SB-Mid-client-test-key');
});

test('production environment uses the Midtrans production Snap URL', async () => {
    resetMidtransRuntimeForTests();
    const harness = makeHarness({
        environment: 'production',
        onAppend(script, windowRef) {
            queueMicrotask(() => {
                windowRef.snap = { pay() {} };
                script.dispatch('load');
            });
        }
    });
    await loadMidtransSnap(harness);
    assert.equal(harness.inserted[0].src, 'https://app.midtrans.com/snap/snap.js');
});

test('SDK load failure removes the failed script and a later attempt can retry', async () => {
    resetMidtransRuntimeForTests();
    let attempt = 0;
    const harness = makeHarness({
        onAppend(script, windowRef) {
            attempt += 1;
            queueMicrotask(() => {
                if (attempt === 1) script.dispatch('error');
                else {
                    windowRef.snap = { pay() {} };
                    script.dispatch('load');
                }
            });
        }
    });
    await assert.rejects(loadMidtransSnap(harness), { code: 'MIDTRANS_SDK_LOAD_FAILED' });
    assert.equal(harness.inserted.length, 0);
    const snap = await loadMidtransSnap(harness);
    assert.equal(typeof snap.pay, 'function');
    assert.equal(attempt, 2);
});

test('SDK load timeout cleans up the element and allows an explicit retry', async () => {
    resetMidtransRuntimeForTests();
    let attempt = 0;
    const harness = makeHarness({
        onAppend(script, windowRef) {
            attempt += 1;
            if (attempt === 2) {
                queueMicrotask(() => {
                    windowRef.snap = { pay() {} };
                    script.dispatch('load');
                });
            }
        }
    });
    await assert.rejects(loadMidtransSnap({ ...harness, timeoutMs: 5 }), { code: 'MIDTRANS_SDK_TIMEOUT' });
    assert.equal(harness.inserted.length, 0);
    assert.equal(typeof (await loadMidtransSnap(harness)).pay, 'function');
    assert.equal(attempt, 2);
});

test('SDK load without window.snap.pay is rejected clearly', async () => {
    resetMidtransRuntimeForTests();
    const harness = makeHarness({ onAppend(script) { queueMicrotask(() => script.dispatch('load')); } });
    await assert.rejects(loadMidtransSnap(harness), { code: 'MIDTRANS_SDK_API_MISSING' });
});

test('already available Snap API is reused without inserting another script', async () => {
    resetMidtransRuntimeForTests();
    const harness = makeHarness();
    harness.windowRef.snap = { pay() {} };
    assert.equal(await loadMidtransSnap(harness), harness.windowRef.snap);
    assert.equal(harness.inserted.length, 0);
});

test('language-engine delegates SDK loading through the ES6 module, not a direct global lookup', () => {
    const engine = fs.readFileSync(new URL('../assets/js/language-engine.js', import.meta.url), 'utf8');
    const html = fs.readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
    assert.match(engine, /import \{ isMidtransConfigured, loadMidtransSnap \} from '\.\/midtrans-runtime\.js'/);
    assert.match(engine, /const midtransSnap = await loadMidtransSnap\(\)/);
    assert.match(engine, /midtransSnap\.pay\(data\.token/);
    assert.doesNotMatch(engine, /window\.snap\.pay/);
    assert.doesNotMatch(html, /<script[^>]+snap\.js/i);
    assert.match(html, /meta name="midtrans-snap-config" data-client-key="YOUR_CLIENT_KEY" data-environment="sandbox"/);
});
