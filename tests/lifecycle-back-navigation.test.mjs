/** [AI-GENERATED][QA][V196] Runtime tests for the production browser back handler. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const windowListeners = new Map();
const documentListeners = new Map();
let activeOverlay = null;
let activePageModal = null;
let activeRecipeListModal = null;
let toggledModal = null;
let switchedTo = null;

function createClassList(initial = []) {
    const values = new Set(initial);
    return {
        add(name) { values.add(name); },
        remove(name) { values.delete(name); },
        contains(name) { return values.has(name); },
        toggle(name, force) {
            const next = force === undefined ? !values.has(name) : Boolean(force);
            next ? values.add(name) : values.delete(name);
            return next;
        }
    };
}

function createOverlay(className) {
    const attributes = new Map([['aria-hidden', 'false']]);
    return {
        id: className === 'tips-modal' ? 'tips-page' : 'recipe',
        classList: createClassList([className, 'active']),
        style: { display: 'flex' },
        attributes,
        setAttribute(name, value) { attributes.set(name, String(value)); },
        getAttribute(name) { return attributes.get(name) ?? null; }
    };
}

const doc = {
    visibilityState: 'hidden',
    body: { style: { overflow: 'hidden' } },
    addEventListener(name, handler) {
        const list = documentListeners.get(name) || [];
        list.push(handler);
        documentListeners.set(name, list);
    },
    removeEventListener(name, handler) {
        documentListeners.set(name, (documentListeners.get(name) || []).filter((item) => item !== handler));
    },
    getElementById(id) { return id === 'recipe-list-modal' ? activeRecipeListModal : null; },
    querySelector(selector) {
        if (selector === '.recipe-modal.active, .tips-modal.active') {
            return activeOverlay?.classList.contains('active') ? activeOverlay : null;
        }
        if (selector === '.page-modal.active, .unified-modal.active' ||
            selector === '.unified-modal.active, .page-modal.active') {
            return activePageModal?.classList.contains('active') ? activePageModal : null;
        }
        if (selector === '.unified-modal.active, .page-modal.active, .recipe-modal.active, .tips-modal.active') {
            if (activePageModal?.classList.contains('active')) return activePageModal;
            return activeOverlay?.classList.contains('active') ? activeOverlay : null;
        }
        return null;
    }
};

globalThis.document = doc;
globalThis.window = globalThis;
globalThis.addEventListener = (name, handler) => {
    const list = windowListeners.get(name) || [];
    list.push(handler);
    windowListeners.set(name, list);
};
globalThis.removeEventListener = (name, handler) => {
    windowListeners.set(name, (windowListeners.get(name) || []).filter((item) => item !== handler));
};
globalThis.Capacitor = { isNativePlatform: () => false };
// [AI-GENERATED][QA][V199] Simulate the canonical scroll-lock bridge exposed by modal-bootstrap.js.
globalThis.__TPModalCore = {
    syncBodyScrollLock() {
        const locked = Boolean(
            activeOverlay?.classList.contains('active') ||
            activePageModal?.classList.contains('active') ||
            activeRecipeListModal?.classList.contains('active')
        );
        doc.body.style.overflow = locked ? 'hidden' : '';
        return locked;
    }
};

await import('../assets/js/app-lifecycle-service.js');

function dispatchWindowEvent(name) {
    for (const handler of windowListeners.get(name) || []) handler({ type: name });
}

function resetOverlay(kind = 'tips-modal') {
    activeOverlay = createOverlay(kind);
    activePageModal = null;
    activeRecipeListModal = null;
    switchedTo = null;
    toggledModal = null;
    window.toggleModal = (id) => {
        toggledModal = id;
        activePageModal?.classList.remove('active');
        return true;
    };
    window.switchTab = (tabName) => {
        switchedTo = tabName;
        activeOverlay.classList.remove('active');
        activeOverlay.style.display = 'none';
        activeOverlay.setAttribute('aria-hidden', 'true');
        window.__TPModalCore.syncBodyScrollLock();
    };
}

test('browser Back returns from Tips to the Timer tab through the production lifecycle handler', () => {
    resetOverlay('tips-modal');
    window.AppLifecycleService.init();
    dispatchWindowEvent('popstate');

    assert.equal(switchedTo, 'timer');
    assert.equal(activeOverlay.classList.contains('active'), false);
    assert.equal(activeOverlay.style.display, 'none');
    assert.equal(activeOverlay.getAttribute('aria-hidden'), 'true');
    assert.equal(document.body.style.overflow, '');
});

test('browser Back returns from the Recipe tab to Timer instead of leaving an active overlay', () => {
    resetOverlay('recipe-modal');
    dispatchWindowEvent('popstate');

    assert.equal(switchedTo, 'timer');
    assert.equal(activeOverlay.classList.contains('active'), false);
});

test('tab overlays close safely even when app-core has not registered switchTab yet', () => {
    resetOverlay('tips-modal');
    delete window.switchTab;
    dispatchWindowEvent('popstate');

    assert.equal(activeOverlay.classList.contains('active'), false);
    assert.equal(activeOverlay.style.display, 'none');
    assert.equal(activeOverlay.getAttribute('aria-hidden'), 'true');
    assert.equal(document.body.style.overflow, '');
});


test('Back closes a topmost page modal before the underlying Tips tab', () => {
    resetOverlay('tips-modal');
    activePageModal = createOverlay('page-modal');
    activePageModal.id = 'settings-modal';
    dispatchWindowEvent('popstate');

    assert.equal(toggledModal, 'settings-modal');
    assert.equal(switchedTo, null);
    assert.equal(activeOverlay.classList.contains('active'), true);
});


// [AI-GENERATED][QA][V238] The Back handler must recover if the modal bridge throws.
test('browser Back normalizes an active modal when the modal bridge throws', () => {
    resetOverlay('tips-modal');
    activePageModal = createOverlay('page-modal');
    activePageModal.id = 'settings-modal';
    window.toggleModal = () => { throw new Error('modal bridge unavailable'); };
    const originalWarn = console.warn;
    console.warn = () => {};

    try {
        dispatchWindowEvent('popstate');
    } finally {
        console.warn = originalWarn;
    }

    assert.equal(activePageModal.classList.contains('active'), false);
    assert.equal(activePageModal.style.display, 'none');
    assert.equal(activePageModal.getAttribute('aria-hidden'), 'true');
    assert.equal(activePageModal.getAttribute('inert'), '');
    assert.equal(activeOverlay.classList.contains('active'), true);
    assert.equal(document.body.style.overflow, 'hidden');
});

// [AI-GENERATED][QA][V238] A bridge that returns without closing must also fall back safely.
test('browser Back normalizes an active modal when the modal bridge is incomplete', () => {
    resetOverlay('tips-modal');
    activePageModal = createOverlay('page-modal');
    activePageModal.id = 'settings-modal';
    window.toggleModal = () => true;

    dispatchWindowEvent('popstate');

    assert.equal(activePageModal.classList.contains('active'), false);
    assert.equal(activePageModal.style.display, 'none');
    assert.equal(activePageModal.getAttribute('aria-hidden'), 'true');
    assert.equal(activePageModal.getAttribute('inert'), '');
    assert.equal(activeOverlay.classList.contains('active'), true);
    assert.equal(document.body.style.overflow, 'hidden');
});

test('native Back uses the same modal-before-tab precedence as browser Back', () => {
    const lifecycle = fs.readFileSync(new URL('../assets/js/app-lifecycle-service.js', import.meta.url), 'utf8');
    assert.match(lifecycle, /function closeTopmostModalOrTabOverlay\(\)/);
    assert.match(lifecycle, /async function handlePopState\(\)[\s\S]*?closeTopmostModalOrTabOverlay\(\)\)/);
    assert.match(lifecycle, /async function handleNativeBackButton\(\)[\s\S]*?if \(closeTopmostModalOrTabOverlay\(\)\) return;/);
    assert.match(lifecycle, /\.recipe-modal\.active, \.tips-modal\.active/);
});


function createRecipeListModal() {
    const attributes = new Map();
    return {
        id: 'recipe-list-modal',
        classList: createClassList(['page-modal', 'active']),
        style: { display: 'flex' },
        attributes,
        setAttribute(name, value) { attributes.set(name, String(value)); },
        getAttribute(name) { return attributes.get(name) ?? null; }
    };
}

test('browser Back safely closes the legacy recipe-list modal when its bridge is missing', () => {
    resetOverlay('tips-modal');
    activeOverlay.classList.remove('active');
    activeOverlay = null;
    activeRecipeListModal = createRecipeListModal();
    delete window.tutupDaftarResepTersimpan;
    document.body.style.overflow = 'hidden';
    dispatchWindowEvent('popstate');

    assert.equal(activeRecipeListModal.classList.contains('active'), false);
    assert.equal(activeRecipeListModal.style.display, 'none');
    assert.equal(activeRecipeListModal.getAttribute('inert'), '');
    assert.equal(document.body.style.overflow, '');
});

test('browser Back normalizes the recipe-list modal when its legacy close bridge throws', () => {
    resetOverlay('tips-modal');
    activeOverlay.classList.remove('active');
    activeOverlay = null;
    activeRecipeListModal = createRecipeListModal();
    window.tutupDaftarResepTersimpan = () => { throw new Error('bridge unavailable'); };
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
        dispatchWindowEvent('popstate');
    } finally {
        console.warn = originalWarn;
    }

    assert.equal(activeRecipeListModal.classList.contains('active'), false);
    assert.equal(activeRecipeListModal.style.display, 'none');
    assert.equal(activeRecipeListModal.getAttribute('inert'), '');
    assert.equal(document.body.style.overflow, '');
});

test('closing recipe-list modal keeps background scroll locked if another overlay remains active', () => {
    resetOverlay('tips-modal');
    activeRecipeListModal = createRecipeListModal();
    window.tutupDaftarResepTersimpan = () => {
        activeRecipeListModal.classList.remove('active');
        activeRecipeListModal.setAttribute('inert', '');
        document.body.style.overflow = '';
    };
    dispatchWindowEvent('popstate');

    assert.equal(activeRecipeListModal.classList.contains('active'), false);
    assert.equal(activeOverlay.classList.contains('active'), true);
    assert.equal(document.body.style.overflow, 'hidden');
});

// [AI-GENERATED][QA][V236] Browser and native lifecycle signals may report the same transition.
function dispatchDocumentEvent(name) {
    for (const handler of documentListeners.get(name) || []) handler({ type: name });
}

test('duplicate lifecycle signals are deduplicated and distinct transitions are serialized', async () => {
    await window.AppLifecycleService.destroy();
    document.visibilityState = 'hidden';

    const calls = [];
    let releaseFirstBackground;
    let firstBackground = true;

    window.AppLifecycleService.init({
        onBackground: async (source) => {
            calls.push(`background:start:${source}`);
            if (firstBackground) {
                firstBackground = false;
                await new Promise((resolve) => { releaseFirstBackground = resolve; });
            }
            calls.push(`background:end:${source}`);
        },
        onForeground: async (source) => {
            calls.push(`foreground:${source}`);
        }
    });

    // Repeated hidden signals represent one state transition.
    dispatchDocumentEvent('visibilitychange');
    dispatchDocumentEvent('visibilitychange');
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, ['background:start:initial']);

    // A different state must queue behind the pending background flush.
    document.visibilityState = 'visible';
    dispatchDocumentEvent('visibilitychange');
    dispatchDocumentEvent('visibilitychange');
    document.visibilityState = 'hidden';
    dispatchDocumentEvent('visibilitychange');
    dispatchDocumentEvent('visibilitychange');

    assert.equal(typeof releaseFirstBackground, 'function');
    releaseFirstBackground();
    for (let i = 0; i < 5 && calls.length < 5; i += 1) {
        await new Promise((resolve) => setImmediate(resolve));
    }

    assert.deepEqual(calls, [
        'background:start:initial',
        'background:end:initial',
        'foreground:visibility',
        'background:start:visibility',
        'background:end:visibility'
    ]);

    await window.AppLifecycleService.destroy();
});


// [AI-GENERATED][QA][V237] Repeated init must not detach callback ownership from bound listeners.
test('duplicate init calls preserve the original lifecycle callbacks until destroy', async () => {
    await window.AppLifecycleService.destroy();
    document.visibilityState = 'hidden';

    const originalCalls = [];
    const replacementCalls = [];
    window.AppLifecycleService.init({
        onForeground: (source) => originalCalls.push(`foreground:${source}`),
        onBackground: (source) => originalCalls.push(`background:${source}`)
    });

    // This must be a no-op while the service is already initialized.
    window.AppLifecycleService.init({
        onForeground: (source) => replacementCalls.push(`foreground:${source}`),
        onBackground: (source) => replacementCalls.push(`background:${source}`)
    });

    document.visibilityState = 'visible';
    dispatchDocumentEvent('visibilitychange');
    for (let i = 0; i < 5 && originalCalls.length < 1 && replacementCalls.length < 1; i += 1) {
        await new Promise((resolve) => setImmediate(resolve));
    }

    document.visibilityState = 'hidden';
    dispatchDocumentEvent('visibilitychange');
    for (let i = 0; i < 5 && originalCalls.length < 3 && replacementCalls.length < 1; i += 1) {
        await new Promise((resolve) => setImmediate(resolve));
    }

    assert.deepEqual(originalCalls, ['background:initial', 'foreground:visibility', 'background:visibility']);
    assert.deepEqual(replacementCalls, []);
    await window.AppLifecycleService.destroy();
});


// [AI-GENERATED][QA][V239] A stale callback may hang, but must not block a new lifecycle generation.
test('reinitializing lifecycle service is not blocked by a pending callback from the destroyed generation', async () => {
    await window.AppLifecycleService.destroy();
    document.visibilityState = 'visible';

    let releaseOldCallback;
    let signalOldStarted;
    const oldStarted = new Promise((resolve) => { signalOldStarted = resolve; });
    const oldCallbackGate = new Promise((resolve) => { releaseOldCallback = resolve; });
    const newCalls = [];

    window.AppLifecycleService.init({
        onForeground: async () => {
            signalOldStarted();
            await oldCallbackGate;
        }
    });

    try {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            if (await Promise.race([oldStarted.then(() => true), new Promise((resolve) => setImmediate(() => resolve(false)))])) break;
        }
        assert.equal(typeof releaseOldCallback, 'function');
        await oldStarted;

        // Destroy does not wait for application callbacks to settle.
        await window.AppLifecycleService.destroy();
        window.AppLifecycleService.init({
            onForeground: (source) => newCalls.push(source)
        });

        for (let attempt = 0; attempt < 10 && newCalls.length === 0; attempt += 1) {
            await new Promise((resolve) => setImmediate(resolve));
        }

        assert.deepEqual(newCalls, ['initial']);
    } finally {
        // Always release the intentionally suspended callback to avoid leaking test state.
        releaseOldCallback?.();
        await window.AppLifecycleService.destroy();
    }
});
