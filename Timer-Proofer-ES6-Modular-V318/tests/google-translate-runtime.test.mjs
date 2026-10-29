/** [AI-GENERATED][QA][V260] Verify Google's callback SDK is isolated behind a retryable ES6 Module adapter. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    googleTranslateElementInit,
    loadGoogleTranslateWidget,
    patchGoogleTranslateSelect,
    resetGoogleTranslateRuntimeForTests
} from '../assets/js/google-translate-runtime.js';

function makeHarness({ onAppend = null, apiAvailable = false } = {}) {
    const inserted = [];
    const selects = [];
    const container = { id: 'google_translate_element' };
    let initCount = 0;
    const listeners = new WeakMap();
    const documentRef = {
        body: {},
        head: {
            appendChild(script) {
                inserted.push(script);
                script.parentNode = this;
                script.remove = () => {
                    const index = inserted.indexOf(script);
                    if (index >= 0) inserted.splice(index, 1);
                    script.parentNode = null;
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
        createElement(tagName) {
            const element = {
                tagName: String(tagName).toUpperCase(),
                dataset: {},
                attributes: {},
                addEventListener(eventName, callback) {
                    if (!listeners.has(this)) listeners.set(this, new Map());
                    const events = listeners.get(this);
                    const callbacks = events.get(eventName) || [];
                    callbacks.push(callback);
                    events.set(eventName, callbacks);
                },
                removeEventListener(eventName, callback) {
                    const events = listeners.get(this);
                    if (!events) return;
                    events.set(eventName, (events.get(eventName) || []).filter((item) => item !== callback));
                },
                setAttribute(name, value) { this.attributes[name] = String(value); },
                dispatch(eventName) {
                    for (const callback of [...(listeners.get(this)?.get(eventName) || [])]) callback({ type: eventName });
                }
            };
            return element;
        },
        getElementById(id) {
            if (id === 'google_translate_element') return container;
            return inserted.find((element) => element.id === id) || null;
        },
        querySelector(selector) {
            if (selector === 'select.goog-te-combo') return selects[0] || null;
            return null;
        },
        querySelectorAll(selector) {
            return selector === 'select.goog-te-combo' ? selects : [];
        }
    };
    const windowRef = {};
    const installApi = () => {
        windowRef.google = { translate: { TranslateElement: class {
            constructor() {
                initCount += 1;
                selects.push({
                    id: '', name: '', options: [{ value: '' }, { value: 'fr' }],
                    dispatchEvent() {}
                });
            }
        } } };
    };
    if (apiAvailable) installApi();
    return { documentRef, windowRef, inserted, selects, installApi, getInitCount: () => initCount };
}

function reset() {
    resetGoogleTranslateRuntimeForTests();
}

test('Google Translate callback is registered before script insertion and one load initializes the widget once', async () => {
    reset();
    const harness = makeHarness({
        onAppend(script, windowRef) {
            assert.equal(typeof windowRef.googleTranslateElementInit, 'function');
            harness.installApi();
            windowRef.googleTranslateElementInit();
            script.dispatch('load');
        }
    });
    const options = { documentRef: harness.documentRef, windowRef: harness.windowRef };
    const first = loadGoogleTranslateWidget(options);
    const second = loadGoogleTranslateWidget(options);
    assert.equal(first, second);
    assert.equal(await first, true);
    assert.equal(harness.inserted.length, 1);
    assert.equal(harness.getInitCount(), 1);
    assert.equal(harness.inserted[0].src, 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit');
    assert.equal(harness.selects[0].id, 'google-translate-language');
    assert.equal(harness.selects[0].name, 'googtrans');
});

test('script error is cleaned up and the adapter permits a later retry', async () => {
    reset();
    let attemptCount = 0;
    const harness = makeHarness({
        onAppend(script, windowRef) {
            attemptCount += 1;
            if (attemptCount === 1) script.dispatch('error');
            else {
                harness.installApi();
                windowRef.googleTranslateElementInit();
            }
        }
    });
    const options = { documentRef: harness.documentRef, windowRef: harness.windowRef };
    await assert.rejects(loadGoogleTranslateWidget(options), { code: 'GOOGLE_TRANSLATE_SCRIPT_LOAD_FAILED' });
    assert.equal(harness.inserted.length, 0);
    assert.equal(await loadGoogleTranslateWidget(options), true);
    assert.equal(attemptCount, 2);
    assert.equal(harness.getInitCount(), 1);
});

test('script load without named callback fails clearly and removes the script', async () => {
    reset();
    const harness = makeHarness({ onAppend(script) { script.dispatch('load'); } });
    await assert.rejects(loadGoogleTranslateWidget({
        documentRef: harness.documentRef,
        windowRef: harness.windowRef,
        timeoutMs: 100
    }), { code: 'GOOGLE_TRANSLATE_CALLBACK_MISSING' });
    assert.equal(harness.inserted.length, 0);
});

test('timeout removes the script and allows another attempt', async () => {
    reset();
    let attemptCount = 0;
    const harness = makeHarness({
        onAppend(script, windowRef) {
            attemptCount += 1;
            if (attemptCount > 1) {
                harness.installApi();
                windowRef.googleTranslateElementInit();
            }
        }
    });
    const options = { ...harness, timeoutMs: 5 };
    await assert.rejects(loadGoogleTranslateWidget(options), { code: 'GOOGLE_TRANSLATE_TIMEOUT' });
    assert.equal(harness.inserted.length, 0);
    assert.equal(await loadGoogleTranslateWidget({ ...harness, timeoutMs: 100 }), true);
    assert.equal(attemptCount, 2);
});

test('pre-existing widget is patched without injecting another SDK script', async () => {
    reset();
    const harness = makeHarness();
    harness.selects.push({ id: '', name: '', options: [{ value: 'id' }, { value: 'fr' }] });
    assert.equal(patchGoogleTranslateSelect(harness.documentRef), true);
    assert.equal(await loadGoogleTranslateWidget({
        documentRef: harness.documentRef,
        windowRef: harness.windowRef
    }), true);
    assert.equal(harness.inserted.length, 0);
    assert.equal(harness.selects[0].id, 'google-translate-language');
});

test('language engine delegates TranslateElement and script loading to the ESM adapter', () => {
    const engine = fs.readFileSync(new URL('../assets/js/language-engine.js', import.meta.url), 'utf8');
    const runtime = fs.readFileSync(new URL('../assets/js/google-translate-runtime.js', import.meta.url), 'utf8');
    const manifest = fs.readFileSync(new URL('../assets/js/module-manifest.js', import.meta.url), 'utf8');
    const sw = fs.readFileSync(new URL('../www/sw.js', import.meta.url), 'utf8');
    assert.match(engine, /from '\.\/google-translate-runtime\.js'/);
    assert.match(engine, /await loadGoogleTranslateWidget\(/);
    assert.doesNotMatch(engine, /function\s+gtLoadScript\s*\(/);
    assert.doesNotMatch(engine, /new google\.translate\.TranslateElement/);
    assert.match(runtime, /windowRef\.googleTranslateElementInit\s*=\s*googleTranslateElementInit/);
    assert.match(manifest, /google-translate-runtime\.js/);
    assert.match(sw, /'\.\/assets\/js\/google-translate-runtime\.js'/);
    assert.equal(typeof googleTranslateElementInit, 'function');
});
