/**
 * [AI-GENERATED][ES6 MODULE][V258]
 * Runtime integrations are initialized through ES modules. The local html2pdf UMD
 * bundle is imported as a side-effect module and exposes a temporary compatibility
 * facade for native/browser export callers that are being migrated incrementally.
 */

const GOOGLE_ANALYTICS_ID = 'G-QNGDTC4HVF';
let initializationPromise = null;

function getDocument() {
    return globalThis.document || null;
}

function getWindow() {
    return globalThis.window || null;
}

function isHttpRuntime() {
    return /^https?:$/.test(globalThis.location?.protocol || '');
}

function appendLinkIfMissing({ selector, rel, href }) {
    const documentRef = getDocument();
    if (!documentRef?.head || documentRef.querySelector(selector)) return false;

    const link = documentRef.createElement('link');
    link.rel = rel;
    link.href = href;
    documentRef.head.appendChild(link);
    return true;
}

function loadClassicScript(id, src, { async = true } = {}) {
    const documentRef = getDocument();
    if (!documentRef?.head) return Promise.reject(new Error('Dokumen belum siap memuat skrip.'));

    const selector = `script[data-tp-runtime="${id}"]`;
    const existing = documentRef.querySelector(selector);
    if (existing) {
        if (existing.dataset?.tpLoaded === 'true') return Promise.resolve(existing);
        return Promise.reject(new Error(`Skrip runtime ${id} sudah ada tetapi statusnya tidak diketahui.`));
    }

    return new Promise((resolve, reject) => {
        const script = documentRef.createElement('script');
        script.dataset.tpRuntime = id;
        script.async = async;
        script.src = src;
        script.addEventListener('load', () => {
            script.dataset.tpLoaded = 'true';
            resolve(script);
        }, { once: true });
        script.addEventListener('error', () => {
            reject(new Error(`Gagal memuat skrip runtime ${id}.`));
        }, { once: true });
        documentRef.head.appendChild(script);
    });
}

function initializeAnalytics() {
    const windowRef = getWindow();
    if (!windowRef) return false;

    if (!Array.isArray(windowRef.dataLayer)) windowRef.dataLayer = [];
    // [AI-GENERATED][COMPATIBILITY][V255] Retain the callable global contract used by app-core.
    if (typeof windowRef.gtag !== 'function') {
        windowRef.gtag = function gtag() {
            windowRef.dataLayer.push(arguments);
        };
    }

    windowRef.gtag('js', new Date());
    windowRef.gtag('config', GOOGLE_ANALYTICS_ID);

    // [AI-GENERATED][REFACTOR][V255] Load the analytics SDK only after the queue/config exist.
    void loadClassicScript(
        'google-analytics',
        `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`
    ).catch((error) => {
        console.warn('[RuntimeBootstrap] Analytics tidak tersedia; aplikasi tetap berjalan:', error);
    });

    return true;
}

// [AI-GENERATED][ES6 MODULE][V258] Import the bundled local PDF library without injecting a classic script tag.
function importLocalHtml2PdfModule() {
    return import(new URL('./html2pdf.bundle.min.js', import.meta.url).href);
}

async function initializeRuntimeIntegrations({ loadHtml2PdfModule = importLocalHtml2PdfModule } = {}) {
    const state = {
        analyticsQueueReady: initializeAnalytics(),
        manifestLinked: false,
        html2pdf: 'skipped'
    };

    if (isHttpRuntime()) {
        try {
            state.manifestLinked = appendLinkIfMissing({
                selector: 'link[rel="manifest"]',
                rel: 'manifest',
                href: new URL('./manifest.json', globalThis.location.href).href
            }) || Boolean(getDocument()?.querySelector('link[rel="manifest"]'));
        } catch (error) {
            console.warn('[RuntimeBootstrap] Manifest tidak dapat dipasang:', error);
        }
    }

    // Direct file:// pages block many module requests; Capacitor custom schemes and
    // HTTP(S) can import this app-local asset. No remote network is needed for html2pdf.
    if ((globalThis.location?.protocol || '') === 'file:') return Object.freeze(state);

    try {
        let moduleImportError = null;
        try {
            await loadHtml2PdfModule();
        } catch (error) {
            moduleImportError = error;
        }

        // [AI-GENERATED][ROBUSTNESS][V258] Older WebViews may reject evaluation of a UMD bundle as ESM.
        // Fall back to a runtime script loader for that compatibility edge only.
        let html2pdfFactory = getWindow()?.html2pdf || globalThis.html2pdf;
        if (typeof html2pdfFactory !== 'function') {
            const bundleUrl = new URL('./html2pdf.bundle.min.js', import.meta.url).href;
            await loadClassicScript('html2pdf-legacy-fallback', bundleUrl, { async: false });
            html2pdfFactory = getWindow()?.html2pdf || globalThis.html2pdf;
        }
        if (typeof html2pdfFactory !== 'function') {
            throw moduleImportError || new Error('Modul html2pdf termuat tanpa menyediakan API kompatibilitas yang diharapkan.');
        }
        state.html2pdf = 'loaded';
    } catch (error) {
        // PDF is an optional capability. Failure must not block timer/auth startup.
        state.html2pdf = 'unavailable';
        console.warn('[RuntimeBootstrap] html2pdf tidak tersedia; fitur PDF dapat dinonaktifkan:', error);
    }

    return Object.freeze(state);
}

/**
 * Initialize runtime integrations once. The caller awaits this before importing
 * boot.js so dependent application modules see the compatibility facades they need.
 */
export function initializeRuntimeBootstrap(options = {}) {
    if (!initializationPromise) {
        initializationPromise = initializeRuntimeIntegrations(options).catch((error) => {
            // [AI-GENERATED][ROBUSTNESS][V255] Optional runtime integrations cannot deadlock app boot.
            console.error('[RuntimeBootstrap] Inisialisasi runtime gagal secara tak terduga:', error);
            return Object.freeze({
                analyticsQueueReady: false,
                manifestLinked: false,
                html2pdf: 'unavailable'
            });
        });
    }
    return initializationPromise;
}
