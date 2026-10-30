/** [AI-GENERATED][QA][V202] Verify atomic precache and app-scoped Cache Storage lookups. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'www/sw.js'), 'utf8');

function createInstallHarness({
    failAt = null,
    failNetworkAt = null,
    failPutAt = null,
    cacheNames = [],
    appCacheEntries = {},
    foreignCacheEntries = {}
} = {}) {
    const handlers = new Map();
    const putCalls = [];
    const fetchCalls = [];
    const cacheDeletes = [];
    const appCacheMatchCalls = [];
    let globalCacheMatchCalls = 0;
    let skipWaitingCalls = 0;
    const appEntries = new Map(Object.entries(appCacheEntries));
    const foreignEntries = new Map(Object.entries(foreignCacheEntries));
    const getKey = (request) => typeof request === 'string' ? request : String(request?.url || request);
    const cache = {
        async put(request, response) {
            putCalls.push({ request, response });
            if (getKey(request) === failPutAt) throw new Error('mock Cache Storage write failure');
            appEntries.set(getKey(request), response);
        },
        async match(request, options = {}) {
            const key = getKey(request);
            appCacheMatchCalls.push({ key, options });
            if (appEntries.has(key)) return appEntries.get(key);
            // Cache.match() normally ignores query only when explicitly requested.
            if (options.ignoreSearch) {
                const base = key.split('?')[0];
                for (const [candidate, response] of appEntries) {
                    if (candidate.split('?')[0] === base) return response;
                }
            }
            return undefined;
        }
    };
    const context = {
        console: { log() {}, warn() {}, error() {} },
        URL,
        Request: class MockRequest {
            constructor(url, options = {}) { this.url = String(url); this.cache = options.cache; }
        },
        fetch: async (request) => {
            const key = getKey(request);
            fetchCalls.push(key);
            if (key === failNetworkAt) throw new Error('mock network failure');
            if (key === failAt) return { ok: false, status: 503, clone() { return this; } };
            return { ok: true, status: 200, url: key, clone() { return this; } };
        },
        caches: {
            async open() { return cache; },
            async delete(name) { cacheDeletes.push(name); return true; },
            async keys() { return cacheNames; },
            async match(request, options) {
                globalCacheMatchCalls += 1;
                const key = getKey(request);
                // Deliberately model global lookup finding an entry owned by another app.
                if (foreignEntries.has(key)) return foreignEntries.get(key);
                return cache.match(request, options);
            }
        },
        self: {
            location: { origin: 'https://example.test' },
            addEventListener(type, callback) { handlers.set(type, callback); },
            async skipWaiting() { skipWaitingCalls += 1; },
            clients: { async claim() {}, async matchAll() { return []; } }
        }
    };
    vm.runInNewContext(source, context, { filename: 'sw.js' });
    return {
        async install() {
            let installPromise;
            handlers.get('install')({ waitUntil(promise) { installPromise = promise; } });
            await installPromise;
        },
        async activate() {
            let activationPromise;
            handlers.get('activate')({ waitUntil(promise) { activationPromise = promise; } });
            await activationPromise;
        },
        dispatchFetch(request) {
            let handled = false;
            handlers.get('fetch')({ request, respondWith() { handled = true; } });
            return handled;
        },
        async dispatchFetchResponse(request) {
            let handled = false;
            let responsePromise;
            handlers.get('fetch')({ request, respondWith(promise) { handled = true; responsePromise = promise; } });
            return { handled, response: handled ? await responsePromise : undefined };
        },
        get fetchCalls() { return fetchCalls; },
        get putCalls() { return putCalls; },
        get cacheDeletes() { return cacheDeletes; },
        get skipWaitingCalls() { return skipWaitingCalls; },
        get appCacheMatchCalls() { return appCacheMatchCalls; },
        get globalCacheMatchCalls() { return globalCacheMatchCalls; }
    };
}

function expectedAssets() {
    const match = source.match(/const ASSETS\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(match, 'Service Worker ASSETS list must exist');
    return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]);
}

test('Service Worker activates only after every required precache asset is stored', async () => {
    const harness = createInstallHarness();
    await harness.install();
    assert.equal(harness.fetchCalls.length, expectedAssets().length);
    assert.equal(harness.putCalls.length, expectedAssets().length);
    assert.equal(harness.skipWaitingCalls, 1);
    assert.deepEqual(harness.cacheDeletes, []);
});

test('Service Worker rejects partial precache and preserves the previous active worker', async () => {
    const failedAsset = './index.html';
    const harness = createInstallHarness({ failAt: failedAsset });
    await assert.rejects(harness.install(), /Precache gagal untuk \.\/index\.html/);
    assert.equal(harness.fetchCalls.length, 2, 'install should stop after the first required asset failure');
    assert.equal(harness.putCalls.length, 1, 'only the first successfully fetched asset should have been stored');
    assert.equal(harness.skipWaitingCalls, 0, 'a partial worker must not skip waiting');
    assert.deepEqual(harness.cacheDeletes, ['Timer-Proofing-v1.1.228']);
});


test('activation deletes only previous Timer-Proofing caches, not other apps on the same origin', async () => {
    const harness = createInstallHarness({ cacheNames: [
        'Timer-Proofing-v1.1.106',
        'Timer-Proofing-v1.1.107',
        'other-application-cache-v4',
        'Timer-Proofing-v1.1.108',
        'Timer-Proofing-v1.1.109',
        'Timer-Proofing-v1.1.110',
        'Timer-Proofing-v1.1.111',
        'Timer-Proofing-v1.1.112',
        'Timer-Proofing-v1.1.113',
        'Timer-Proofing-v1.1.114',
        'Timer-Proofing-v1.1.115',
        'Timer-Proofing-v1.1.116',
        'Timer-Proofing-v1.1.117',
        'Timer-Proofing-v1.1.118',
        'Timer-Proofing-v1.1.119',
        'Timer-Proofing-v1.1.120',
        'Timer-Proofing-v1.1.121',
        'Timer-Proofing-v1.1.122'
    ] });
    await harness.activate();
    assert.deepEqual(harness.cacheDeletes, ['Timer-Proofing-v1.1.106', 'Timer-Proofing-v1.1.107', 'Timer-Proofing-v1.1.108', 'Timer-Proofing-v1.1.109', 'Timer-Proofing-v1.1.110', 'Timer-Proofing-v1.1.111', 'Timer-Proofing-v1.1.112', 'Timer-Proofing-v1.1.113', 'Timer-Proofing-v1.1.114', 'Timer-Proofing-v1.1.115', 'Timer-Proofing-v1.1.116', 'Timer-Proofing-v1.1.117', 'Timer-Proofing-v1.1.118', 'Timer-Proofing-v1.1.119', 'Timer-Proofing-v1.1.120', 'Timer-Proofing-v1.1.121', 'Timer-Proofing-v1.1.122']);
});

test('same-origin API GET responses bypass Service Worker Cache Storage', () => {
    const harness = createInstallHarness();
    const handled = harness.dispatchFetch({
        method: 'GET',
        url: 'https://example.test/api/weather?lat=-7.2&lon=112.7',
        mode: 'cors'
    });
    assert.equal(handled, false, 'API requests should continue through the browser network stack');
    assert.equal(harness.putCalls.length, 0, 'API payload must not be persisted by this fetch handler');
});


test('offline navigation never serves another app cache entry from the same origin', async () => {
    const foreignIndex = { owner: 'other-app', body: 'FOREIGN INDEX' };
    const requestUrl = 'https://example.test/';
    const ownOfflineIndex = { owner: 'timer-proofer', body: 'TIMER PROOFER OFFLINE' };
    const harness = createInstallHarness({
        failNetworkAt: requestUrl,
        appCacheEntries: { './index.html': ownOfflineIndex },
        foreignCacheEntries: { [requestUrl]: foreignIndex }
    });

    const result = await harness.dispatchFetchResponse({
        method: 'GET', url: requestUrl, mode: 'navigate'
    });

    assert.equal(result.handled, true);
    assert.equal(result.response, ownOfflineIndex, 'navigation should use this app’s cached index fallback');
    assert.notEqual(result.response, foreignIndex, 'navigation must not reuse a foreign app response');
    assert.equal(harness.globalCacheMatchCalls, 0, 'the global caches.match() API must not be used');
    assert.ok(harness.appCacheMatchCalls.some(({ key }) => key === requestUrl));
    assert.ok(harness.appCacheMatchCalls.some(({ key }) => key === './index.html'));
});

test('offline static-asset lookup cannot leak a matching foreign app cache entry', async () => {
    const requestUrl = 'https://example.test/assets/js/boot.js?v=20261012-v214';
    const harness = createInstallHarness({
        failNetworkAt: requestUrl,
        foreignCacheEntries: { [requestUrl]: { owner: 'other-app', body: 'FOREIGN JS' } }
    });

    await assert.rejects(harness.dispatchFetchResponse({
        method: 'GET', url: requestUrl, mode: 'cors'
    }), /mock network failure/);

    assert.equal(harness.globalCacheMatchCalls, 0, 'the global caches.match() API must not be used');
    assert.ok(harness.appCacheMatchCalls.some(({ key }) => key === requestUrl));
});


test('a successful online navigation is not broken by a Cache Storage write failure', async () => {
    const requestUrl = 'https://example.test/tips';
    const harness = createInstallHarness({ failPutAt: requestUrl });

    const result = await harness.dispatchFetchResponse({
        method: 'GET', url: requestUrl, mode: 'navigate'
    });

    assert.equal(result.handled, true);
    assert.equal(result.response?.ok, true, 'the valid network response should still be returned');
    assert.equal(result.response?.url, requestUrl);
    assert.equal(harness.globalCacheMatchCalls, 0);
});
