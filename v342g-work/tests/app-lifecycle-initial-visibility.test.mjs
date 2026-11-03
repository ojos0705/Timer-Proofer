/** [AI-GENERATED][QA][V247] Initial visibility reconciliation for hidden app/WebView startup. */
import test from 'node:test';
import assert from 'node:assert/strict';

const documentListeners = new Map();
const windowListeners = new Map();
const documentStub = {
    visibilityState: 'hidden',
    addEventListener(name, callback) {
        const listeners = documentListeners.get(name) || new Set();
        listeners.add(callback);
        documentListeners.set(name, listeners);
    },
    removeEventListener(name, callback) {
        documentListeners.get(name)?.delete(callback);
    },
    querySelector() { return null; },
    getElementById() { return null; }
};

globalThis.document = documentStub;
globalThis.window = globalThis;
globalThis.addEventListener = (name, callback) => {
    const listeners = windowListeners.get(name) || new Set();
    listeners.add(callback);
    windowListeners.set(name, listeners);
};
globalThis.removeEventListener = (name, callback) => {
    windowListeners.get(name)?.delete(callback);
};
globalThis.Capacitor = { isNativePlatform: () => false };

await import('../assets/js/app-lifecycle-service.js');

// [AI-GENERATED][QA][V247] A hidden document must get an initial background
// transition, so asynchronous native persistence can be flushed even when no
// visibilitychange event occurs after listener registration.
test('initializes the lifecycle in hidden state and runs the background callback once', async () => {
    documentStub.visibilityState = 'hidden';
    let backgroundCalls = 0;
    let foregroundCalls = 0;

    window.AppLifecycleService.init({
        onBackground() { backgroundCalls += 1; },
        onForeground() { foregroundCalls += 1; }
    });

    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(backgroundCalls, 1, 'hidden startup should reconcile through onBackground');
    assert.equal(foregroundCalls, 0, 'hidden startup must not be treated as foreground');
    await window.AppLifecycleService.destroy();
});
