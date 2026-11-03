/**
 * [AI-GENERATED][ES6 MODULE][V259]
 * Midtrans Snap runtime adapter.
 *
 * Midtrans's browser Snap SDK still exposes a `window.snap` API rather than an
 * importable ESM export. This module contains that third-party compatibility
 * boundary, loads Snap only when checkout needs it, validates configuration,
 * coalesces concurrent load requests, and permits retries after a failed load.
 */
const SNAP_SCRIPT_MARKER = 'midtrans-snap';
const SNAP_CONFIG_SELECTOR = 'meta[name="midtrans-snap-config"]';
const SANDBOX_SNAP_URL = 'https://app.sandbox.midtrans.com/snap/snap.js';
const PRODUCTION_SNAP_URL = 'https://app.midtrans.com/snap/snap.js';

let snapLoadPromise = null;

function readConfig(documentRef = globalThis.document) {
    const configElement = documentRef?.querySelector?.(SNAP_CONFIG_SELECTOR);
    const clientKey = String(
        configElement?.getAttribute?.('data-client-key')
        ?? configElement?.dataset?.clientKey
        ?? ''
    ).trim();
    const environment = String(
        configElement?.getAttribute?.('data-environment')
        ?? configElement?.dataset?.environment
        ?? 'sandbox'
    ).trim().toLowerCase();

    return Object.freeze({
        clientKey,
        environment: environment === 'production' ? 'production' : 'sandbox',
        src: environment === 'production' ? PRODUCTION_SNAP_URL : SANDBOX_SNAP_URL
    });
}

function configurationError() {
    const error = new Error('Client Key Midtrans belum dikonfigurasi. Isi data-client-key pada meta midtrans-snap-config dengan Client Key dari dashboard Midtrans.');
    error.code = 'MIDTRANS_CONFIG_MISSING';
    return error;
}

function isPlaceholderKey(clientKey) {
    return !clientKey || /^(?:your[_ -]?client[_ -]?key|change[_ -]?me|placeholder)$/i.test(clientKey);
}

function getSnapApi(windowRef = globalThis.window) {
    const snap = windowRef?.snap || globalThis.snap;
    return snap && typeof snap.pay === 'function' ? snap : null;
}

/** Return whether frontend Snap configuration contains a non-placeholder Client Key. */
export function isMidtransConfigured({ documentRef = globalThis.document } = {}) {
    return !isPlaceholderKey(readConfig(documentRef).clientKey);
}

/**
 * Load and return Midtrans Snap. The in-flight promise is shared across callers;
 * a failed load is cleared so a later explicit checkout attempt can retry.
 */
export function loadMidtransSnap({
    documentRef = globalThis.document,
    windowRef = globalThis.window,
    timeoutMs = 15_000
} = {}) {
    const readySnap = getSnapApi(windowRef);
    if (readySnap) return Promise.resolve(readySnap);
    if (snapLoadPromise) return snapLoadPromise;

    const config = readConfig(documentRef);
    if (isPlaceholderKey(config.clientKey)) return Promise.reject(configurationError());
    if (!documentRef?.head || typeof documentRef.createElement !== 'function') {
        const error = new Error('Dokumen belum siap memuat Midtrans Snap.');
        error.code = 'MIDTRANS_DOCUMENT_UNAVAILABLE';
        return Promise.reject(error);
    }

    const scriptSelector = `script[data-tp-runtime="${SNAP_SCRIPT_MARKER}"]`;
    const existingScript = documentRef.querySelector?.(scriptSelector);
    if (existingScript?.dataset?.tpLoaded === 'true') {
        const error = new Error('Midtrans Snap pernah dimuat tetapi API window.snap.pay tidak tersedia.');
        error.code = 'MIDTRANS_SDK_API_MISSING';
        return Promise.reject(error);
    }

    const attempt = new Promise((resolve, reject) => {
        const script = documentRef.createElement('script');
        let settled = false;
        let timeoutId = null;

        const cleanup = ({ removeScript = false } = {}) => {
            if (timeoutId !== null) globalThis.clearTimeout(timeoutId);
            script.removeEventListener?.('load', onLoad);
            script.removeEventListener?.('error', onError);
            if (removeScript && script.parentNode?.removeChild) {
                try { script.parentNode.removeChild(script); } catch (_) { /* best-effort cleanup */ }
            } else if (removeScript && typeof script.remove === 'function') {
                script.remove();
            }
        };
        const finishFailure = (error) => {
            if (settled) return;
            settled = true;
            cleanup({ removeScript: true });
            reject(error);
        };
        const onLoad = () => {
            if (settled) return;
            const snap = getSnapApi(windowRef);
            if (!snap) {
                const error = new Error('Skrip Midtrans berhasil dimuat tetapi API window.snap.pay tidak tersedia.');
                error.code = 'MIDTRANS_SDK_API_MISSING';
                finishFailure(error);
                return;
            }
            settled = true;
            cleanup();
            script.dataset.tpLoaded = 'true';
            resolve(snap);
        };
        const onError = () => {
            const error = new Error('Gagal memuat Midtrans Snap. Periksa koneksi internet lalu coba lagi.');
            error.code = 'MIDTRANS_SDK_LOAD_FAILED';
            finishFailure(error);
        };

        script.dataset.tpRuntime = SNAP_SCRIPT_MARKER;
        script.async = true;
        script.src = config.src;
        script.setAttribute?.('data-client-key', config.clientKey);
        script.dataset.clientKey = config.clientKey;
        script.addEventListener('load', onLoad, { once: true });
        script.addEventListener('error', onError, { once: true });

        timeoutId = globalThis.setTimeout(() => {
            const error = new Error('Waktu pemuatan Midtrans Snap habis. Periksa koneksi lalu coba kembali.');
            error.code = 'MIDTRANS_SDK_TIMEOUT';
            finishFailure(error);
        }, Math.max(1, Number(timeoutMs) || 15_000));

        try {
            documentRef.head.appendChild(script);
        } catch (error) {
            finishFailure(error);
        }
    });

    snapLoadPromise = attempt;
    // Attach handlers without replacing the promise returned to all coalesced callers.
    attempt.then(
        () => { if (snapLoadPromise === attempt) snapLoadPromise = null; },
        () => { if (snapLoadPromise === attempt) snapLoadPromise = null; }
    );
    return attempt;
}

/** Test-only hook to isolate global module state across deterministic unit tests. */
export function resetMidtransRuntimeForTests() {
    snapLoadPromise = null;
}
