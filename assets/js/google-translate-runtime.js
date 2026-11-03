/**
 * [AI-GENERATED][ES6 MODULE][V260]
 * Google Translate's vendor script still uses a named global callback. Keep that
 * compatibility boundary here; application code only calls this retryable module API.
 */
const GOOGLE_TRANSLATE_SCRIPT_ID = 'gt-element-script';
const GOOGLE_TRANSLATE_SCRIPT_URL = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
const GOOGLE_TRANSLATE_CONTAINER_ID = 'google_translate_element';

let loadPromise = null;
let activeAttempt = null;
let initializedDocument = null;
let mutationObserver = null;
let observerTimeoutId = null;

function getWindow() {
    return globalThis.window || globalThis;
}

function getDocument() {
    return globalThis.document || null;
}

function makeError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function getReadySelect(documentRef = getDocument()) {
    const combo = documentRef?.querySelector?.('select.goog-te-combo');
    return combo && combo.options?.length > 1 ? combo : null;
}

/** Wait for Google's asynchronously-rendered language selector, not merely the script callback. */
function waitForGoogleTranslateSelect(documentRef, timeoutMs = 10_000) {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const poll = () => {
            const combo = getReadySelect(documentRef);
            if (combo) {
                patchGoogleTranslateSelect(documentRef);
                resolve(combo);
                return;
            }
            if (Date.now() - startedAt >= timeoutMs) {
                reject(makeError(
                    'Widget Google Translate sudah dipanggil tetapi daftar bahasa belum tersedia.',
                    'GOOGLE_TRANSLATE_SELECT_TIMEOUT'
                ));
                return;
            }
            globalThis.setTimeout(poll, 150);
        };
        poll();
    });
}

function removeElement(element) {
    try {
        if (typeof element?.remove === 'function') element.remove();
        else if (element?.parentNode?.removeChild) element.parentNode.removeChild(element);
    } catch (error) {
        console.warn('[GoogleTranslateRuntime] Elemen skrip gagal dibersihkan:', error);
    }
}

function stopSelectObserver() {
    try { mutationObserver?.disconnect?.(); } catch (_) {}
    mutationObserver = null;
    if (observerTimeoutId !== null) globalThis.clearTimeout(observerTimeoutId);
    observerTimeoutId = null;
}

/** Patch the vendor-generated select while preserving the existing widget/container IDs. */
export function patchGoogleTranslateSelect(documentRef = getDocument()) {
    if (!documentRef?.querySelectorAll) return false;
    const selects = [...documentRef.querySelectorAll('select.goog-te-combo')];
    if (!selects.length) return false;

    selects.forEach((googleSelect, index) => {
        if (!googleSelect.id) {
            const baseId = 'google-translate-language';
            googleSelect.id = index === 0 ? baseId : `${baseId}-${index + 1}`;
        }
        if (!googleSelect.name) googleSelect.name = 'googtrans';
    });
    stopSelectObserver();
    return true;
}

function initializeWidget(documentRef, windowRef) {
    const TranslateElement = windowRef?.google?.translate?.TranslateElement;
    if (typeof TranslateElement !== 'function') {
        throw makeError('SDK Google Translate tidak menyediakan TranslateElement.', 'GOOGLE_TRANSLATE_API_MISSING');
    }
    const container = documentRef?.getElementById?.(GOOGLE_TRANSLATE_CONTAINER_ID);
    if (!container) {
        throw makeError(`Elemen #${GOOGLE_TRANSLATE_CONTAINER_ID} tidak ditemukan.`, 'GOOGLE_TRANSLATE_CONTAINER_MISSING');
    }

    if (initializedDocument !== documentRef) {
        new TranslateElement({ pageLanguage: 'id', autoDisplay: false }, GOOGLE_TRANSLATE_CONTAINER_ID);
        initializedDocument = documentRef;
    }

    if (!patchGoogleTranslateSelect(documentRef)) {
        const Observer = windowRef?.MutationObserver || globalThis.MutationObserver;
        const body = documentRef.body;
        if (typeof Observer === 'function' && body) {
            stopSelectObserver();
            mutationObserver = new Observer(() => patchGoogleTranslateSelect(documentRef));
            mutationObserver.observe(body, { childList: true, subtree: true });
            observerTimeoutId = globalThis.setTimeout(stopSelectObserver, 10_000);
        }
    }
    return true;
}

function settleAttempt(attempt, error = null) {
    if (!attempt || attempt.settled) return;
    attempt.settled = true;
    if (attempt.timeoutId !== null) globalThis.clearTimeout(attempt.timeoutId);
    attempt.script?.removeEventListener?.('load', attempt.onLoad);
    attempt.script?.removeEventListener?.('error', attempt.onError);

    if (error) {
        removeElement(attempt.script);
        attempt.reject(error);
        if (activeAttempt === attempt) activeAttempt = null;
        if (loadPromise === attempt.promise) loadPromise = null;
        attempt.windowRef.__TP_GOOGLE_TRANSLATE_ERROR__ = error;
        return;
    }

    if (attempt.script?.dataset) attempt.script.dataset.tpLoaded = 'true';
    attempt.windowRef.__TP_GOOGLE_TRANSLATE_ERROR__ = null;
    attempt.resolve(true);
    if (activeAttempt === attempt) activeAttempt = null;
}

/**
 * Callback required by Google's `?cb=googleTranslateElementInit` protocol.
 * The name remains global only as a vendor-required compatibility bridge.
 */
export function googleTranslateElementInit() {
    const attempt = activeAttempt;
    const documentRef = attempt?.documentRef || getDocument();
    const windowRef = attempt?.windowRef || getWindow();
    try {
        // A previous SDK load may have called back before its <select> was ready.
        if (!getReadySelect(documentRef) && initializedDocument === documentRef) {
            initializedDocument = null;
        }
        initializeWidget(documentRef, windowRef);
        if (attempt) {
            attempt.callbackInvoked = true;
            void waitForGoogleTranslateSelect(documentRef, attempt.timeoutMs)
                .then(() => settleAttempt(attempt))
                .catch((error) => {
                    initializedDocument = null;
                    settleAttempt(attempt, error);
                });
        } else if (!getReadySelect(documentRef)) {
            // Keep the adapter retryable when the vendor callback is invoked outside
            // a user-initiated load (for example, during a stale startup restore).
            void waitForGoogleTranslateSelect(documentRef, 10_000).catch((error) => {
                initializedDocument = null;
                windowRef.__TP_GOOGLE_TRANSLATE_ERROR__ = error;
                console.warn('[GoogleTranslateRuntime] Daftar bahasa belum siap:', error);
            });
        }
        return true;
    } catch (error) {
        if (attempt) settleAttempt(attempt, error);
        else {
            initializedDocument = null;
            windowRef.__TP_GOOGLE_TRANSLATE_ERROR__ = error;
            console.warn('[GoogleTranslateRuntime] Widget gagal diinisialisasi:', error);
        }
        return false;
    }
}

/** Load Google Translate on demand, deduplicating concurrent callers and allowing retries. */
export function loadGoogleTranslateWidget({
    timeoutMs = 15_000,
    documentRef = getDocument(),
    windowRef = getWindow()
} = {}) {
    if (!documentRef?.head || !documentRef?.createElement || !windowRef) {
        return Promise.reject(makeError('Lingkungan browser untuk Google Translate belum tersedia.', 'GOOGLE_TRANSLATE_ENVIRONMENT_MISSING'));
    }

    // Concurrent callers must share the in-flight promise even if the <select>
    // appears while the first caller is still completing its readiness handshake.
    if (loadPromise) return loadPromise;
    const readyCombo = getReadySelect(documentRef);
    if (readyCombo) {
        patchGoogleTranslateSelect(documentRef);
        initializedDocument = documentRef;
        return Promise.resolve(true);
    }

    // Do not memoize a script callback as success until the widget's real language
    // selector exists and contains language options. A failed render must be retryable.
    const safeTimeout = Math.max(1_000, Number(timeoutMs) || 15_000);
    const installApi = typeof windowRef.google?.translate?.TranslateElement === 'function';

    if (installApi) {
        initializedDocument = null;
        const promise = (async () => {
            initializeWidget(documentRef, windowRef);
            await waitForGoogleTranslateSelect(documentRef, safeTimeout);
            return true;
        })();
        loadPromise = promise;
        promise.catch((error) => {
            initializedDocument = null;
            if (loadPromise === promise) loadPromise = null;
            windowRef.__TP_GOOGLE_TRANSLATE_ERROR__ = error;
        });
        return promise;
    }

    const staleScript = documentRef.getElementById?.(GOOGLE_TRANSLATE_SCRIPT_ID);
    if (staleScript) removeElement(staleScript);

    let resolveAttempt;
    let rejectAttempt;
    const promise = new Promise((resolve, reject) => {
        resolveAttempt = resolve;
        rejectAttempt = reject;
    });
    const script = documentRef.createElement('script');
    const attempt = {
        promise,
        resolve: resolveAttempt,
        reject: rejectAttempt,
        documentRef,
        windowRef,
        script,
        settled: false,
        callbackInvoked: false,
        timeoutMs: safeTimeout,
        timeoutId: null,
        onLoad: null,
        onError: null
    };
    activeAttempt = attempt;
    loadPromise = promise;

    // Install Google's required named callback before adding the vendor script.
    windowRef.googleTranslateElementInit = googleTranslateElementInit;
    script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
    script.async = true;
    script.src = GOOGLE_TRANSLATE_SCRIPT_URL;
    script.dataset = script.dataset || {};
    script.dataset.tpRuntime = 'google-translate';

    attempt.onLoad = () => {
        Promise.resolve().then(() => {
            if (!attempt.settled && !attempt.callbackInvoked) {
                settleAttempt(attempt, makeError(
                    'Skrip Google Translate dimuat tetapi callback inisialisasi tidak terpanggil.',
                    'GOOGLE_TRANSLATE_CALLBACK_MISSING'
                ));
            }
        });
    };
    attempt.onError = () => settleAttempt(attempt, makeError(
        'Library Google Translate gagal dimuat. Periksa koneksi internet lalu coba lagi.',
        'GOOGLE_TRANSLATE_SCRIPT_LOAD_FAILED'
    ));
    script.addEventListener('load', attempt.onLoad, { once: true });
    script.addEventListener('error', attempt.onError, { once: true });
    attempt.timeoutId = globalThis.setTimeout(() => settleAttempt(attempt, makeError(
        'Waktu pemuatan Google Translate habis. Periksa koneksi lalu coba kembali.',
        'GOOGLE_TRANSLATE_TIMEOUT'
    )), safeTimeout);

    try {
        documentRef.head.appendChild(script);
    } catch (error) {
        settleAttempt(attempt, error);
    }

    promise.catch(() => {
        initializedDocument = null;
        if (loadPromise === promise) loadPromise = null;
    });
    return promise;
}

/** Test-only hook to isolate module state and observer resources across deterministic tests. */
export function resetGoogleTranslateRuntimeForTests() {
    stopSelectObserver();
    if (activeAttempt && !activeAttempt.settled) {
        settleAttempt(activeAttempt, makeError('Pemuatan dibatalkan untuk reset tes.', 'GOOGLE_TRANSLATE_TEST_RESET'));
    }
    loadPromise = null;
    activeAttempt = null;
    initializedDocument = null;
}
