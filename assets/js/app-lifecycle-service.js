/**
 * [AI-GENERATED][RECONSTRUCTION][V37] Canonical application lifecycle owner.
 * Owns browser visibility, Capacitor appState, native back-button, and history
 * lifecycle listeners while delegating business actions to registered callbacks.
 */

import { NativeCapacitorService } from './native-capacitor-service.js';
import { syncModalBodyScrollLock } from './modal-bootstrap.js?v=20261030-v326'; // [AI-GENERATED][ES6 MODULE IDENTITY][V270]

let lifecycleCallbacks = {};
let initialized = false;
let nativeListenerHandles = [];
let lifecycleGeneration = 0;
// [AI-GENERATED][ROBUSTNESS][V236] Browser visibility and Capacitor appState
// can report the same transition. Serialize lifecycle callbacks and collapse
// duplicate consecutive transitions so restore/flush cannot race with itself.
let lifecycleTransitionQueue = Promise.resolve();
let lastScheduledLifecycleState = null;
// [AI-GENERATED][PWA BACK GUARD][V326] Keep an active proofing session inside
// the installed PWA when the browser's Back action is used. The guard is
// deliberately independent of native Capacitor back handling.
let webTimerBackGuardActive = false;
let webTimerBackGuardInstalled = false;
let suppressNextWebPopState = false;
let webPopStateHandling = false;

function isNativeApp() {
    // [AI-GENERATED][REFACTOR][V40] Native detection has one canonical owner.
    return NativeCapacitorService.isNativePlatform();
}

async function callSafely(name, ...args) {
    const callback = lifecycleCallbacks[name];
    if (typeof callback !== 'function') return undefined;
    try {
        // [AI-GENERATED][ROBUSTNESS][V43] Also catch rejected async callbacks so
        // lifecycle events cannot create unhandled Promise rejections.
        return await callback(...args);
    } catch (error) {
        console.error(`[AppLifecycle] Callback ${name} gagal:`, error);
        return undefined;
    }
}

// [AI-GENERATED][ROBUSTNESS][V236] Queue distinct lifecycle transitions while
// deduplicating duplicate signals from visibilitychange and Capacitor appState.
// Generation guards prevent queued events from an old initialization from
// invoking callbacks belonging to a newly initialized app instance.
function scheduleLifecycleTransition(state, source) {
    if (!initialized) return Promise.resolve(undefined);
    if (state === lastScheduledLifecycleState) return lifecycleTransitionQueue;

    lastScheduledLifecycleState = state;
    const generation = lifecycleGeneration;
    const callbackName = state === 'foreground' ? 'onForeground' : 'onBackground';

    lifecycleTransitionQueue = lifecycleTransitionQueue
        .catch((error) => {
            // The queue should recover even if an unexpected error escapes a callback.
            console.warn('[AppLifecycle] Antrean transisi sebelumnya gagal:', error);
        })
        .then(async () => {
            if (!initialized || generation !== lifecycleGeneration) return undefined;
            return callSafely(callbackName, source);
        });

    return lifecycleTransitionQueue;
}

function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        void scheduleLifecycleTransition('foreground', 'visibility');
    } else {
        void scheduleLifecycleTransition('background', 'visibility');
    }
}

// [AI-GENERATED][BUG FIX][V196] Recipe and Tips are full-screen tab overlays,
// not `.page-modal` elements. Close them through the canonical tab controller
// before falling through to modal handling, so Back does not minimize the app
// while the user is still inside Tips/Recipe.
function closeActiveTabOverlay() {
    const activeOverlay = document.querySelector('.recipe-modal.active, .tips-modal.active');
    if (!activeOverlay) return false;

    if (typeof window.switchTab === 'function') {
        window.switchTab('timer');
        return true;
    }

    // Safe fallback for startup failures where app-core has not exported switchTab.
    activeOverlay.classList.remove('active');
    activeOverlay.style.display = 'none';
    activeOverlay.setAttribute('aria-hidden', 'true');
    // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
    syncModalBodyScrollLock();
    return true;
}

// [AI-GENERATED][REFACTOR][V196] One precedence rule is shared by browser and
// Capacitor Back: close the topmost page modal first, then Recipe/Tips overlays.
function closeTopmostModalOrTabOverlay() {
    const activeModal = document.querySelector('.unified-modal.active, .page-modal.active');
    if (activeModal) {
        if (typeof window.toggleModal === 'function') {
            try {
                window.toggleModal(activeModal.id);
            } catch (error) {
                // [AI-GENERATED][ROBUSTNESS][V238] A partially initialized modal bridge
                // must not make browser/native Back appear unresponsive.
                console.warn('[AppLifecycle] Jembatan penutup modal gagal:', error);
            }
        }

        // [AI-GENERATED][BUG FIX][V238] A missing, throwing, or incomplete bridge can
        // leave the modal active. Normalize its DOM state before returning success.
        if (activeModal.classList?.contains('active')) {
            activeModal.classList.remove('active');
            if (activeModal.style) activeModal.style.display = 'none';
            activeModal.setAttribute?.('aria-hidden', 'true');
            activeModal.setAttribute?.('inert', '');
        }

        // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
        syncModalBodyScrollLock();
        return true;
    }

    return closeActiveTabOverlay();
}

// [AI-GENERATED][ROBUSTNESS][V197] The legacy recipe-list modal has its own
// close bridge. Still normalize its state if that bridge is unavailable, throws,
// or only partially updates the DOM (for example while app-core is booting).
function closeRecipeListModalIfOpen() {
    const modal = document.getElementById('recipe-list-modal');
    if (!modal || !modal.classList?.contains('active')) return false;

    try {
        if (typeof window.tutupDaftarResepTersimpan === 'function') {
            const result = window.tutupDaftarResepTersimpan();
            // Keep this handler synchronous, but observe async failures from any
            // replacement bridge instead of creating an unhandled rejection.
            if (result && typeof result.then === 'function') {
                void Promise.resolve(result).catch((error) => {
                    console.warn('[AppLifecycle] Menutup daftar resep gagal:', error);
                });
            }
        }
    } catch (error) {
        console.warn('[AppLifecycle] Menutup daftar resep gagal:', error);
    }

    // [AI-GENERATED][BUG FIX][V197] The callback may be missing or incomplete.
    modal.classList.remove('active');
    if (modal.style) modal.style.display = 'none';
    modal.setAttribute?.('inert', '');

    // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
    syncModalBodyScrollLock();
    return true;
}

function pushWebTimerBackGuard() {
    if (isNativeApp() || !webTimerBackGuardActive || webTimerBackGuardInstalled) return false;
    try {
        const currentState = window.history.state && typeof window.history.state === 'object'
            ? window.history.state
            : {};
        window.history.pushState({ ...currentState, __tpProofingTimerBackGuard: true }, '', window.location.href);
        webTimerBackGuardInstalled = true;
        return true;
    } catch (error) {
        console.warn('[AppLifecycle] Gagal memasang guard tombol Back PWA:', error);
        return false;
    }
}

/**
 * Install/remove the browser history sentinel while the proofing countdown is active.
 * Capacitor uses its native backButton event and never receives this browser guard.
 */
function setTimerBackGuard(active) {
    webTimerBackGuardActive = Boolean(active) && !isNativeApp();
    if (webTimerBackGuardActive) {
        pushWebTimerBackGuard();
        return true;
    }

    // If the sentinel is still the current history entry, consume it quietly so
    // stopping the timer does not leave an extra no-op Back step for the user.
    if (!isNativeApp() && webTimerBackGuardInstalled && window.history.state?.__tpProofingTimerBackGuard === true) {
        suppressNextWebPopState = true;
        try { window.history.back(); } catch (_) { suppressNextWebPopState = false; }
    }
    webTimerBackGuardInstalled = false;
    return true;
}

async function handlePopState() {
    if (suppressNextWebPopState) {
        suppressNextWebPopState = false;
        return;
    }
    if (webPopStateHandling) return;
    webPopStateHandling = true;
    try {
        // Preserve existing precedence: close the topmost modal/tab before
        // switching the active timer into PiP/minimized mode.
        if (closeRecipeListModalIfOpen()) {
            if (webTimerBackGuardActive) { webTimerBackGuardInstalled = false; pushWebTimerBackGuard(); }
            return;
        }
        if (closeTopmostModalOrTabOverlay()) {
            if (webTimerBackGuardActive) { webTimerBackGuardInstalled = false; pushWebTimerBackGuard(); }
            return;
        }

        if (webTimerBackGuardActive && !isNativeApp()) {
            webTimerBackGuardInstalled = false; // The browser has consumed the previous sentinel.
            const handled = await callSafely('onBackButton', 'browser-popstate');
            if (handled === true && webTimerBackGuardActive) pushWebTimerBackGuard();
        }
    } finally {
        webPopStateHandling = false;
    }
}

async function handleNativeBackButton() {
    if (closeRecipeListModalIfOpen()) return;

    if (closeTopmostModalOrTabOverlay()) return;

    if (typeof lifecycleCallbacks.onBackButton === 'function') {
        const handled = await callSafely('onBackButton');
        if (handled === true) return;
    }

    // [AI-GENERATED][ROBUSTNESS][V168] Native plugin lookup and minimize can
    // fail independently (for example during bridge teardown). Keep the back
    // button event from producing an unhandled async rejection.
    try {
        const appPlugin = NativeCapacitorService.getPlugin('App');
        if (typeof appPlugin?.minimizeApp === 'function') {
            await appPlugin.minimizeApp();
        }
    } catch (error) {
        console.warn('[AppLifecycle] Gagal meminimalkan aplikasi:', error);
    }
}

function bindNativeListeners() {
    // [AI-GENERATED][ROBUSTNESS][V160] Capacitor App listeners are native-only.
    // The bundled plugin proxy can exist in browser/PWA mode, but binding its
    // lifecycle events there creates an unnecessary second lifecycle channel.
    if (!isNativeApp()) return;

    const appPlugin = NativeCapacitorService.getPlugin('App');
    const generation = lifecycleGeneration;
    if (!appPlugin || typeof appPlugin.addListener !== 'function') return;

    const addListener = (eventName, handler) => {
        try {
            const handle = appPlugin.addListener(eventName, handler);
            if (handle && typeof handle.then === 'function') {
                handle.then((resolved) => {
                    if (resolved && generation === lifecycleGeneration && initialized) {
                    nativeListenerHandles.push(resolved);
                } else {
                    // [AI-GENERATED][ROBUSTNESS][V129] A late native listener
                    // handle can arrive after destroy(); remove it safely without
                    // assuming remove() always returns a Promise.
                    try {
                        const removal = resolved?.remove?.();
                        // [AI-GENERATED][ROBUSTNESS][V168] Observe rejected cleanup
                        // promises even when the Capacitor handle resolves late.
                        void Promise.resolve(removal).catch((error) => {
                            console.warn(`[AppLifecycle] Listener ${eventName} cleanup gagal:`, error);
                        });
                    } catch (error) {
                        console.warn(`[AppLifecycle] Listener ${eventName} cleanup gagal:`, error);
                    }
                }
                }).catch((error) => console.warn(`[AppLifecycle] Listener ${eventName} gagal:`, error));
            } else if (handle) {
                nativeListenerHandles.push(handle);
            }
        } catch (error) {
            console.warn(`[AppLifecycle] Listener ${eventName} gagal:`, error);
        }
    };

    addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
            void scheduleLifecycleTransition('foreground', 'capacitor');
        } else {
            void scheduleLifecycleTransition('background', 'capacitor');
        }
    });

    addListener('backButton', () => handleNativeBackButton());
}

async function destroy() {
    // [AI-GENERATED][ROBUSTNESS] Invalidate pending addListener promises so a
    // late native listener handle cannot be retained after destroy().
    lifecycleGeneration += 1;
    lastScheduledLifecycleState = null;
    // [AI-GENERATED][BUG FIX][V239] Detach a pending transition chain from future
    // initialization cycles. A callback that never settles must not block a newly
    // initialized lifecycle service after the old generation has been destroyed.
    lifecycleTransitionQueue = Promise.resolve();
    const removals = nativeListenerHandles.map((handle) => {
        try {
            // [AI-GENERATED][ROBUSTNESS][V168] Capacitor listener remove() may
            // return a rejecting Promise; observe it even if callers don't await
            // destroy(), as app-core currently performs fire-and-forget teardown.
            return Promise.resolve(handle.remove?.()).catch((error) => {
                console.warn('[AppLifecycle] Gagal melepas listener:', error);
            });
        } catch (error) {
            console.warn('[AppLifecycle] Gagal melepas listener:', error);
            return Promise.resolve();
        }
    });
    nativeListenerHandles = [];
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('popstate', handlePopState);
    lifecycleCallbacks = {};
    webTimerBackGuardActive = false;
    webTimerBackGuardInstalled = false;
    suppressNextWebPopState = false;
    webPopStateHandling = false;
    initialized = false;
    await Promise.all(removals);
}

function init(callbacks = {}) {
    // [AI-GENERATED][BUG FIX][V237] Initialization is idempotent: a duplicate
    // init call must not silently replace the callback set while the already-bound
    // browser/native listeners keep running. Call destroy() before intentional rebind.
    if (initialized) return;
    lifecycleCallbacks = { ...callbacks };
    initialized = true;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('popstate', handlePopState);
    bindNativeListeners();

    // [AI-GENERATED][ROBUSTNESS][V247] Reconcile both known initial visibility
    // states after binding. When the WebView initializes while hidden, there may
    // be no subsequent visibilitychange event; explicitly run onBackground so
    // asynchronous native timer/log persistence receives its suspend barrier.
    if (document.visibilityState === 'visible') {
        void scheduleLifecycleTransition('foreground', 'initial');
    } else if (document.visibilityState === 'hidden') {
        void scheduleLifecycleTransition('background', 'initial');
    }
}

window.AppLifecycleService = {
    init,
    destroy,
    isNativeApp,
    setTimerBackGuard
};

export { init, destroy, isNativeApp, setTimerBackGuard };
