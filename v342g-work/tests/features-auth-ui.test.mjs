import test from 'node:test';
import assert from 'node:assert/strict';

const authClient = {
    auth: { onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; } },
    from() { return {}; }
};
globalThis.window = { supabase: authClient };
globalThis.document = { body: { classList: { toggle() {} } }, getElementById() { return null; } };
globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };

const { createLogoutHandler, switchAuthTab, validateRegistrationConsent } = await import('../assets/js/features-auth-ui.js?test=v295');

function createFixture(signOut) {
    const calls = { signOut: 0, alerts: [], logs: [], classes: [], attributes: [], syncs: 0 };
    const authWrapper = { style: {} };
    const userModal = {
        classList: { remove(name) { calls.classes.push(['modal', name]); } },
        setAttribute(name, value) { calls.attributes.push([name, value]); }
    };
    const documentRef = {
        body: { classList: {
            remove(name) { calls.classes.push(['body', name]); },
            add(name) { calls.classes.push(['body', name]); }
        } },
        getElementById(id) { return id === 'auth-wrapper' ? authWrapper : id === 'user-modal' ? userModal : null; }
    };
    const handler = createLogoutHandler({
        authService: { async signOut() { calls.signOut += 1; return signOut(); } },
        documentRef,
        confirmUser: () => true,
        alertUser: (message) => calls.alerts.push(message),
        logger: { error(...args) { calls.logs.push(args); } },
        syncScrollLock() { calls.syncs += 1; }
    });
    return { handler, calls, authWrapper };
}

test('successful logout signs out once and updates the existing auth and modal UI', async () => {
    const { handler, calls, authWrapper } = createFixture(async () => true);
    assert.equal(await handler(), true);
    assert.equal(calls.signOut, 1);
    assert.deepEqual(calls.classes, [
        ['body', 'logged-in'], ['body', 'logged-out'], ['modal', 'active']
    ]);
    assert.deepEqual(calls.attributes, [['inert', '']]);
    assert.equal(authWrapper.style.display, 'flex');
    assert.equal(calls.syncs, 1);
});

test('duplicate logout taps share the in-flight UI operation', async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const { handler, calls } = createFixture(() => gate);
    const first = handler();
    assert.equal(await handler(), false);
    assert.equal(calls.signOut, 1);
    release(true);
    assert.equal(await first, true);
});

test('failed logout reports the error and permits a later retry', async () => {
    let fail = true;
    const { handler, calls } = createFixture(async () => {
        if (fail) throw new Error('temporary failure');
        return true;
    });
    assert.equal(await handler(), false);
    assert.match(calls.alerts[0], /temporary failure/);
    fail = false;
    assert.equal(await handler(), true);
    assert.equal(calls.signOut, 2);
});

test('auth mode switcher owns login and registration UI state in the feature module', () => {
    const elements = new Map();
    const makeElement = () => ({
        style: {}, textContent: '', disabled: false, attributes: new Set(),
        classList: { add() {}, remove() {}, toggle(name, force) { this[name] = Boolean(force); } },
        setAttribute(name) { this.attributes.add(name); },
        removeAttribute(name) { this.attributes.delete(name); }
    });
    for (const id of [
        'auth-title', 'auth-subtitle', 'btn-submit-main', 'tab-login', 'tab-register',
        'auth-tab-switch', 'group-name', 'group-password', 'group-remember', 'group-tos',
        'forgot-link-wrapper', 'back-to-login-wrapper', 'auth-divider', 'auth-social-grid',
        'auth-whatsapp-btn', 'input-name', 'input-password', 'auth-error-box'
    ]) elements.set(id, makeElement());
    globalThis.document.getElementById = (id) => elements.get(id) || null;

    assert.equal(switchAuthTab('register'), true);
    assert.equal(globalThis.window.currentAuthMode, 'register');
    assert.equal(elements.get('auth-title').textContent, 'Buat Akun Baru');
    assert.equal(elements.get('btn-submit-main').textContent, 'DAFTAR SEKARANG');
    assert.equal(elements.get('group-name').style.display, 'block');
    assert.equal(elements.get('group-name').classList['active-form'], true);
    assert.equal(elements.get('input-name').attributes.has('required'), true);

    assert.equal(switchAuthTab('unsupported'), false);
    assert.equal(globalThis.window.currentAuthMode, 'register');
    assert.equal(elements.get('group-name').classList['active-form'], true);
});


test('registration consent validation fails closed and points out the unchecked control', () => {
    let focused = 0;
    let reported = null;
    const consent = { checked: false, focus() { focused += 1; } };
    const documentRef = { getElementById(id) { return id === 'agree-tos-checkbox' ? consent : null; } };
    assert.equal(validateRegistrationConsent({ documentRef, onMissing: (control) => { reported = control; } }), false);
    assert.equal(reported, consent);
    assert.equal(focused, 0, 'focus behavior belongs to the submit handler');
});

test('registration consent validation rejects a missing control and accepts an explicit checked state', () => {
    let missingReported = 0;
    assert.equal(validateRegistrationConsent({
        documentRef: { getElementById() { return null; } },
        onMissing() { missingReported += 1; }
    }), false);
    assert.equal(missingReported, 1);
    assert.equal(validateRegistrationConsent({
        documentRef: { getElementById: () => ({ checked: true }) }
    }), true);
});
