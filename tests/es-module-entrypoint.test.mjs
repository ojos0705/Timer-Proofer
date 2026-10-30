/** [AI-GENERATED][QA][V259] Enforce the ES-module runtime entry contract. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const runtimeEntry = fs.readFileSync(new URL('../assets/js/runtime-entry.js', import.meta.url), 'utf8');
const runtimeBootstrap = fs.readFileSync(new URL('../assets/js/runtime-bootstrap.js', import.meta.url), 'utf8');
const modalBootstrap = fs.readFileSync(new URL('../assets/js/modal-bootstrap.js', import.meta.url), 'utf8');
let testImportCounter = 0;

function makeRuntimeHarness({ protocol = 'https:', failRuntimeId = null } = {}) {
    const inserted = [];
    const listeners = new WeakMap();
    const window = {};
    const document = {
        head: {
            appendChild(element) {
                inserted.push(element);
                if (element.tagName !== 'SCRIPT') return element;
                queueMicrotask(() => {
                    const eventName = element.dataset?.tpRuntime === failRuntimeId ? 'error' : 'load';
                    if (eventName === 'load' && element.dataset?.tpRuntime === 'html2pdf-legacy-fallback') {
                        window.html2pdf = () => ({ from: () => ({ outputPdf: async () => 'data:application/pdf;base64,AA==' }) });
                    }
                    for (const callback of listeners.get(element)?.get(eventName) || []) callback({ type: eventName });
                });
                return element;
            }
        },
        createElement(tagName) {
            const element = {
                tagName: String(tagName).toUpperCase(),
                dataset: {},
                addEventListener(eventName, callback) {
                    if (!listeners.has(this)) listeners.set(this, new Map());
                    const events = listeners.get(this);
                    const list = events.get(eventName) || [];
                    list.push(callback);
                    events.set(eventName, list);
                }
            };
            return element;
        },
        querySelector(selector) {
            if (selector === 'link[rel="manifest"]') {
                return inserted.find((element) => element.tagName === 'LINK' && element.rel === 'manifest') || null;
            }
            const match = selector.match(/^script\[data-tp-runtime="([^"]+)"\]$/);
            if (match) return inserted.find((element) => element.tagName === 'SCRIPT' && element.dataset?.tpRuntime === match[1]) || null;
            return null;
        }
    };
    return {
        inserted,
        document,
        window,
        location: { protocol, href: `${protocol}//example.test/app/index.html` }
    };
}

async function withHarness(options, callback) {
    const keys = ['window', 'document', 'location'];
    const previous = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const harness = makeRuntimeHarness(options);
    globalThis.window = harness.window;
    globalThis.document = harness.document;
    globalThis.location = harness.location;
    const previousWarn = console.warn;
    console.warn = () => {};
    try {
        const moduleUrl = new URL('../assets/js/runtime-bootstrap.js', import.meta.url);
        moduleUrl.searchParams.set('test-run', String(++testImportCounter));
        const { initializeRuntimeBootstrap } = await import(moduleUrl.href);
        let pdfLoaderCalls = 0;
        const runtimeOptions = {
            loadHtml2PdfModule: async () => {
                pdfLoaderCalls += 1;
                if (harness.location.protocol !== 'file:' && options.failPdfImport) {
                    throw new Error('mock PDF module import failure');
                }
                harness.window.html2pdf = () => ({ from: () => ({ outputPdf: async () => 'data:application/pdf;base64,AA==' }) });
                return {};
            }
        };
        await callback(await initializeRuntimeBootstrap(runtimeOptions), { ...harness, getPdfLoaderCalls: () => pdfLoaderCalls });
    } finally {
        console.warn = previousWarn;
        for (const key of keys) {
            const descriptor = previous.get(key);
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globalThis[key];
        }
    }
}

test('HTTPS runtime initializes analytics queue and imports the local html2pdf bundle as a module', async () => {
    await withHarness({ protocol: 'https:' }, (state, harness) => {
        assert.equal(state.analyticsQueueReady, true);
        assert.equal(state.manifestLinked, true);
        assert.equal(state.html2pdf, 'loaded');
        assert.deepEqual(Array.from(harness.window.dataLayer, (entry) => Array.from(entry).slice(0, 2)), [
            ['js', harness.window.dataLayer[0][1]],
            ['config', 'G-QNGDTC4HVF']
        ]);
        assert.equal(harness.window.gtag instanceof Function, true);
        assert.ok(harness.inserted.some((element) => element.tagName === 'LINK' && element.rel === 'manifest'));
        assert.equal(typeof harness.window.html2pdf, 'function');
        assert.equal(harness.getPdfLoaderCalls(), 1);
        assert.equal(harness.inserted.some((element) => element.dataset?.tpRuntime === 'html2pdf'), false);
        assert.ok(harness.inserted.some((element) => element.dataset?.tpRuntime === 'google-analytics'));
    });
});

test('file:// runtime skips module PDF loading because direct local files restrict module imports', async () => {
    await withHarness({ protocol: 'file:' }, (state, harness) => {
        assert.equal(state.analyticsQueueReady, true);
        assert.equal(state.manifestLinked, false);
        assert.equal(state.html2pdf, 'skipped');
        assert.equal(harness.inserted.some((element) => element.tagName === 'LINK' && element.rel === 'manifest'), false);
        assert.equal(harness.getPdfLoaderCalls(), 0);
        assert.equal(harness.inserted.some((element) => element.dataset?.tpRuntime === 'html2pdf'), false);
    });
});

test('Capacitor custom URL schemes can load local PDF modules without HTTP-only manifest links', async () => {
    await withHarness({ protocol: 'capacitor:' }, (state, harness) => {
        assert.equal(state.html2pdf, 'loaded');
        assert.equal(state.manifestLinked, false);
        assert.equal(harness.getPdfLoaderCalls(), 1);
    });
});

test('module import failure falls back to the local classic loader on incompatible WebViews', async () => {
    await withHarness({ protocol: 'https:', failPdfImport: true }, (state, harness) => {
        assert.equal(state.html2pdf, 'loaded');
        assert.ok(harness.inserted.some((element) => element.dataset?.tpRuntime === 'html2pdf-legacy-fallback'));
        assert.equal(state.analyticsQueueReady, true);
    });
});

test('PDF module and compatibility fallback failure do not block application runtime initialization', async () => {
    await withHarness({ protocol: 'https:', failPdfImport: true, failRuntimeId: 'html2pdf-legacy-fallback' }, (state) => {
        assert.equal(state.html2pdf, 'unavailable');
        assert.equal(state.analyticsQueueReady, true);
        assert.equal(state.manifestLinked, true);
    });
});

test('index has no executable inline JavaScript and uses a module entrypoint', () => {
    const activeHtml = html.replace(/<!--[\s\S]*?-->/g, '');
    const scriptTags = [...activeHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
    const executableInline = scriptTags.filter(([, attributes, body]) => {
        const type = attributes.match(/\btype\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase();
        return type !== 'importmap' && !/\bsrc\s*=/i.test(attributes) && body.trim() !== '';
    });
    assert.deepEqual(executableInline.map(([, attributes]) => attributes), []);
    assert.match(html, /<script\s+type="module"\s+src="\.\/assets\/js\/runtime-entry\.js\?v=20261030-v325"\s*>/i);
    assert.doesNotMatch(html, /<script\s+src=\"\.\/assets\/js\/modal-bootstrap\.js/i);
    assert.doesNotMatch(html, /<script\s+src=\"https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/i);
    assert.match(html, /\"@supabase\/supabase-js\"\s*:/);
    assert.doesNotMatch(html, /cdnjs\.cloudflare\.com/);
    assert.doesNotMatch(html, /"(?:html2canvas|jspdf)"\s*:/);
    assert.match(runtimeEntry, /await\s+import\('\.\/modal-bootstrap\.js\?v=20261030-v325'\)[\s\S]*initializeModalBootstrap\(\)[\s\S]*void\s+initializeSupabaseSdkBridge\(\)[\s\S]*await\s+initializeRuntimeBootstrap\(\)[\s\S]*await\s+import\('\.\/boot\.js\?v=20261030-v325'\)/);
    assert.match(runtimeEntry, /__TP_MODAL_BOOTSTRAP_ERROR__/);
    assert.match(runtimeEntry, /catch\s*\(error\)[\s\S]*startup utama tetap dilanjutkan/);
    assert.match(modalBootstrap, /export\s+function\s+initializeModalBootstrap\(\)/);
    assert.match(runtimeBootstrap, /windowRef\.gtag\('config',\s*GOOGLE_ANALYTICS_ID\)/);
});
