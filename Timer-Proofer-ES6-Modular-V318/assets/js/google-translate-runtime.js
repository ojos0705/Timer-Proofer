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
        const result = initializeWidget(documentRef, windowRef);
        if (attempt) settleAttempt(attempt);
        return result;
    } catch (error) {
        if (attempt) settleAttempt(attempt, error);
        else {
            windowRef.__TP_GOOGLE_TRANSLATE_ERROR__ = error;
            console.warn('[GoogleTranslateRuntime] Widget gagal diinisialisasi:', error);
        }
        return false;
    }
}

/** Load Google Translate on demand, deduplicating concurrent callers and allowing retries. */
export function loadGoogleTranslateWidget({
    timeoutMs = 10_000,
    documentRef = getDocument(),
    windowRef = getWindow()
} = {}) {
    if (!documentRef?.head || !documentRef?.createElement || !windowRef) {
        return Promise.reject(makeError('Lingkungan browser untuk Google Translate belum tersedia.', 'GOOGLE_TRANSLATE_ENVIRONMENT_MISSING'));
    }
    // A successful or in-flight request owns the result; return its exact promise to concurrent callers.
    if (loadPromise) return loadPromise;
    if (initializedDocument === documentRef || documentRef.querySelector?.('select.goog-te-combo')) {
        if (initializedDocument !== documentRef) {
            patchGoogleTranslateSelect(documentRef);
            initializedDocument = documentRef;
        }
        return Promise.resolve(true);
    }

    // When an earlier script already installed the vendor API, initialize the widget without another request.
    if (typeof windowRef.google?.translate?.TranslateElement === 'function') {
        const previousAttempt = activeAttempt;
        try {
            activeAttempt = null;
            initializeWidget(documentRef, windowRef);
            loadPromise = Promise.resolve(true);
            return loadPromise;
        } catch (error) {
            activeAttempt = previousAttempt;
            return Promise.reject(error);
        }
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
        timeoutId: null,
        onLoad: null,
        onError: null
    };
    activeAttempt = attempt;
    loadPromise = promise;

    // Install the callback before appendChild; the third-party script calls this global during evaluation.
    windowRef.googleTranslateElementInit = googleTranslateElementInit;
    script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
    script.async = true;
    script.src = GOOGLE_TRANSLATE_SCRIPT_URL;
    script.dataset = script.dataset || {};
    script.dataset.tpRuntime = 'google-translate';

    attempt.onLoad = () => {
        // The `cb` callback normally fires before load. Give vendor execution one microtask to settle first.
        Promise.resolve().then(() => {
            if (!attempt.settled) {
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
    )), Math.max(1, Number(timeoutMs) || 10_000));

    try {
        documentRef.head.appendChild(script);
    } catch (error) {
        settleAttempt(attempt, error);
    }

    // Success remains memoized to prevent reinserting the SDK. Failure resets the promise for retry.
    promise.catch(() => {
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
