/** [AI-GENERATED][QA][V198] Runtime regression tests for production modal scroll locking. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function makeClassList(initial = []) {
    const values = new Set(initial);
    return {
        add(value) { values.add(value); },
        remove(value) { values.delete(value); },
        contains(value) { return values.has(value); }
    };
}

function makeElement(id, classes = []) {
    const attributes = new Map();
    return {
        id,
        classList: makeClassList(classes),
        style: { display: classes.includes('active') ? 'flex' : 'none', zIndex: '' },
        dataset: {},
        attributes,
        setAttribute(name, value) { attributes.set(name, String(value)); },
        removeAttribute(name) { attributes.delete(name); },
        getAttribute(name) { return attributes.get(name) ?? null; },
        focus() {}
    };
}

function loadModalBootstrap({ modalIds = ['settings-modal'], overlays = [] } = {}) {
    const modals = new Map(modalIds.map((id) => [id, makeElement(id, ['page-modal'])]));
    const overlayElements = overlays.map(({ id, className, display }) => {
        const element = makeElement(id, className ? [className, ...(className.endsWith('-modal') ? ['active'] : [])] : []);
        if (display !== undefined) element.style.display = display;
        return element;
    });
    const preview = makeElement('modal-preview-foto');
    const allElements = [...modals.values(), ...overlayElements, preview];
    const documentListeners = new Map();
    const document = {
        body: { style: { overflow: 'hidden' } },
        addEventListener(name, handler) {
            const listeners = documentListeners.get(name) || [];
            listeners.push(handler);
            documentListeners.set(name, listeners);
        },
        getElementById(id) { return modals.get(id) || allElements.find((element) => element.id === id) || null; },
        querySelector(selector) {
            const classes = selector.split(',').map((part) => part.trim().split('.').filter(Boolean));
            return allElements.find((element) => classes.some((requiredClasses) =>
                requiredClasses.every((className) => element.classList.contains(className)))) || null;
        },
        querySelectorAll(selector) {
            const classes = selector.split(',').map((part) => part.trim().split('.').filter(Boolean));
            return allElements.filter((element) => classes.some((requiredClasses) =>
                requiredClasses.every((className) => element.classList.contains(className))));
        }
    };
    const window = {
        history: { state: null, pushState(state) { this.state = state; } },
        setTimeout(callback) { callback(); },
        __TPModalCore: null
    };
    const loggedErrors = [];
    const context = {
        window,
        document,
        Element: class Element {},
        console: { info() {}, warn() {}, error(...args) { loggedErrors.push(args); } },
        Date,
        String,
        Boolean,
        Promise
    };
    const source = fs.readFileSync(new URL('../assets/js/modal-bootstrap.js', import.meta.url), 'utf8');
    // [AI-GENERATED][QA][V256] Execute the exported ES-module initializer in the isolated DOM harness.
    const executableSource = source.replace(/^export\s+function\s+/gm, 'function ') + '\ninitializeModalBootstrap();';
    vm.runInNewContext(executableSource, context, { filename: 'modal-bootstrap.js' });
    return {
        window, document, modals, overlays: overlayElements, preview, loggedErrors,
        initializeAgain: context.initializeModalBootstrap,
        getModalCore: context.getModalCore,
        syncModalBodyScrollLock: context.syncModalBodyScrollLock,
        registerNotificationModalHooks: context.registerNotificationModalHooks,
        listenerCount: (name) => (documentListeners.get(name) || []).length
    };
}

test('closing a page modal keeps scroll locked when the Tips overlay remains active', () => {
    const { window, document, modals } = loadModalBootstrap({
        overlays: [{ id: 'tips-page', className: 'tips-modal', display: 'flex' }]
    });
    const modal = modals.get('settings-modal');
    modal.classList.add('active');
    modal.style.display = 'flex';

    assert.equal(window.toggleModal('settings-modal'), true);
    assert.equal(modal.classList.contains('active'), false);
    assert.equal(document.body.style.overflow, 'hidden');
});

test('closeAllModals preserves scroll lock while the recipe-photo preview is visible', () => {
    const { window, document, preview, modals } = loadModalBootstrap();
    modals.get('settings-modal').classList.add('active');
    modals.get('settings-modal').style.display = 'flex';
    preview.style.display = 'flex';

    window.__TPModalCore.closeAllModals();

    assert.equal(modals.get('settings-modal').classList.contains('active'), false);
    assert.equal(preview.style.display, 'flex');
    assert.equal(document.body.style.overflow, 'hidden');
});

test('closing the final visible blocking overlay releases document scroll lock', () => {
    const { window, document, modals } = loadModalBootstrap();
    const modal = modals.get('settings-modal');
    modal.classList.add('active');
    modal.style.display = 'flex';

    window.toggleModal('settings-modal');

    assert.equal(modal.classList.contains('active'), false);
    assert.equal(document.body.style.overflow, '');
});

// [AI-GENERATED][QA][V199] The independent bootstrap is the sole scroll-lock owner.
test('the canonical scroll-lock API accounts for the article overlay', () => {
    const { window, document, overlays } = loadModalBootstrap({
        overlays: [{ id: 'article-modal', className: 'article-modal-overlay', display: 'block' }]
    });
    const article = overlays[0];
    article.classList.add('active');

    assert.equal(window.syncBodyScrollLock(), true);
    assert.equal(document.body.style.overflow, 'hidden');

    article.classList.remove('active');
    article.style.display = 'none';
    assert.equal(window.__TPModalCore.syncBodyScrollLock(), false);
    assert.equal(document.body.style.overflow, '');
});

test('opening a page modal delegates locking to the canonical owner', () => {
    const { window, document, modals } = loadModalBootstrap();
    assert.equal(window.toggleModal('settings-modal'), true);
    assert.equal(modals.get('settings-modal').classList.contains('active'), true);
    assert.equal(document.body.style.overflow, 'hidden');
    assert.equal(window.__TPModalCore.hasBlockingOverlay(), true);
});


test('scroll stays locked while a modal is visibly completing its close transition', () => {
    const { window, document, modals } = loadModalBootstrap();
    const modal = modals.get('settings-modal');
    modal.classList.remove('active');
    modal.style.display = 'flex';

    assert.equal(window.__TPModalCore.syncBodyScrollLock(), true);
    assert.equal(document.body.style.overflow, 'hidden');

    modal.style.display = 'none';
    assert.equal(window.__TPModalCore.syncBodyScrollLock(), false);
    assert.equal(document.body.style.overflow, '');
});


test('delayed notification and language modal closes resync the canonical scroll lock', () => {
    const notificationSource = fs.readFileSync(
        new URL('../assets/js/notification-service.js', import.meta.url), 'utf8'
    );
    const languageSource = fs.readFileSync(
        new URL('../assets/js/language-engine.js', import.meta.url), 'utf8'
    );

    assert.match(notificationSource, /modal\.style\.display = 'none';[\s\S]{0,400}syncModalBodyScrollLock/);
    assert.match(languageSource, /window\.tutupModalBahasa = function\(\)[\s\S]*?toggleModal\('whatsapp-language-modal'\)/);
    assert.doesNotMatch(notificationSource, /document\.body\.style\.overflow\s*=/);
    assert.doesNotMatch(languageSource, /document\.body\.style\.overflow\s*=/);
});


// [AI-GENERATED][QA][V248] Async modal initializer failures must be observed.
test('a rejected async modal initializer is logged without breaking synchronous modal opening', async () => {
    const { window, modals, loggedErrors } = loadModalBootstrap({ modalIds: ['user-modal'] });
    window.loadDynamicProfile = () => Promise.reject(new Error('profile load failed'));

    assert.equal(window.toggleModal('user-modal'), true);
    assert.equal(modals.get('user-modal').classList.contains('active'), true);
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(loggedErrors.length, 1);
    assert.match(String(loggedErrors[0][0]), /Inisialisasi profil gagal/);
    assert.equal(window.__TPModalCore.state.errors, 1);
});


// [AI-GENERATED][QA][V256] The module initializer must be safe to call more than once.
test('ES module modal bootstrap is idempotent and does not register duplicate click handlers', () => {
    const { window, initializeAgain, listenerCount } = loadModalBootstrap();
    const before = listenerCount('click');
    const existingCore = window.__TPModalCore;

    assert.equal(typeof initializeAgain, 'function');
    assert.equal(initializeAgain(), existingCore);
    assert.equal(listenerCount('click'), before);
    assert.equal(window.__TPModalCore, existingCore);
});


// [AI-GENERATED][QA][V263] ESM consumers must use the module-owned modal core.
test('ES module modal-core exports provide the canonical core and scroll-lock behavior', () => {
    const { window, document, modals, getModalCore, syncModalBodyScrollLock } = loadModalBootstrap();
    const core = getModalCore();
    assert.equal(core, window.__TPModalCore);

    const modal = modals.get('settings-modal');
    modal.classList.add('active');
    modal.style.display = 'flex';
    assert.equal(syncModalBodyScrollLock(), true);
    assert.equal(document.body.style.overflow, 'hidden');

    // A mutable legacy bridge must not redirect an already-initialized module's internal binding.
    window.__TPModalCore = { version: 'legacy-replacement', syncBodyScrollLock: () => false };
    assert.equal(getModalCore(), core);
    assert.equal(syncModalBodyScrollLock(), true);
});


// [AI-GENERATED][QA][V272] The modal initializer prefers explicitly registered ES-module callbacks.
test('notification modal prefers registered ES-module hooks over the mutable legacy bridge', () => {
    const { window, registerNotificationModalHooks } = loadModalBootstrap({ modalIds: ['notif-modal'] });
    const calls = [];
    window.NotifSystem = {
        renderList() { calls.push('legacy-render'); },
        updateBadge() { calls.push('legacy-badge'); }
    };
    registerNotificationModalHooks({
        renderList() { calls.push('esm-render'); },
        updateBadge() { calls.push('esm-badge'); }
    });

    assert.equal(window.toggleModal('notif-modal'), true);
    assert.deepEqual(calls, ['esm-render', 'esm-badge']);
});

test('notification modal retains a legacy fallback if it opens before ES-module hooks register', () => {
    const { window } = loadModalBootstrap({ modalIds: ['notif-modal'] });
    const calls = [];
    window.NotifSystem = {
        renderList() { calls.push('legacy-render'); },
        updateBadge() { calls.push('legacy-badge'); }
    };

    assert.equal(window.toggleModal('notif-modal'), true);
    assert.deepEqual(calls, ['legacy-render', 'legacy-badge']);
});
