/**
 * [AI-GENERATED][ES6 MODULE][V266]
 * Deterministic module entrypoint: initialize browser globals/integrations first,
 * then evaluate the application module graph. Kept separate from boot.js so the
 * runtime integration phase can be awaited before dependent modules execute.
 */
import { initializeRuntimeBootstrap } from './runtime-bootstrap.js';
import { initializeSupabaseSdkBridge } from './supabase-runtime.js';

// [AI-GENERATED][AUTH-BOOT][V313] Fail open to the auth screen only after a bounded
// wait if the SDK is unavailable. A later successful INITIAL_SESSION still corrects the UI.
setTimeout(() => {
    if (window.__TP_AUTH_UI_RESOLVED__) return;
    document.body?.classList.remove('auth-pending', 'logged-in');
    document.body?.classList.add('logged-out');
    const authWrapper = document.getElementById('auth-wrapper');
    if (authWrapper) authWrapper.style.display = 'flex';
    console.warn('[AuthBoot] Status sesi belum dapat dipastikan setelah 12 detik; menampilkan layar autentikasi sebagai fallback.');
}, 12000);

// [AI-GENERATED][ES6 MODULE][V259] Initialize the critical modal module first, but isolate its failure.
try {
    const { initializeModalBootstrap } = await import('./modal-bootstrap.js?v=20261030-v320');
    initializeModalBootstrap();
} catch (error) {
    // A modal regression should be visible without preventing timer/auth startup.
    window.__TP_MODAL_BOOTSTRAP_ERROR__ = error;
    console.error('[RuntimeEntry] Modul modal tidak tersedia; startup utama tetap dilanjutkan:', error);
}

// [AI-GENERATED][ES6 MODULE][V266] Keep SDK startup non-blocking and initialize its
// authentication facade through the module export, without resolving a mutable auth global.
// AuthService must only be touched after boot has evaluated its lifecycle hooks; otherwise an
// early INITIAL_SESSION callback could run before app-core has registered those hooks.
let applicationBooted = false;
let supabaseBridgeReady = false;
let authServiceInitializationPromise = null;

function initializeAuthServiceModuleAfterBoot() {
    if (!applicationBooted || !supabaseBridgeReady) return Promise.resolve(false);
    if (authServiceInitializationPromise) return authServiceInitializationPromise;

    let initialization;
    initialization = import('./auth-service.js')
        .then(({ AuthService }) => {
            AuthService.getClient?.();
            AuthService.init?.();
            return true;
        })
        .catch((error) => {
            if (authServiceInitializationPromise === initialization) {
                authServiceInitializationPromise = null;
            }
            console.warn('[RuntimeEntry] SDK siap tetapi lifecycle autentikasi belum dapat diikat:', error);
            return false;
        });
    authServiceInitializationPromise = initialization;
    return initialization;
}

void initializeSupabaseSdkBridge()
    .then(() => {
        window.__TP_SUPABASE_SDK_STATUS__ = 'ready';
        delete window.__TP_SUPABASE_SDK_ERROR__;
        supabaseBridgeReady = true;
        if (applicationBooted) void initializeAuthServiceModuleAfterBoot();
    })
    .catch((error) => {
        window.__TP_SUPABASE_SDK_STATUS__ = 'unavailable';
        window.__TP_SUPABASE_SDK_ERROR__ = error;
        console.warn('[RuntimeEntry] Supabase SDK belum tersedia; fitur akun akan mencoba kembali saat digunakan:', error);
    });

await initializeRuntimeBootstrap();

try {
    // [AI-GENERATED][CACHE BUSTING][V267] Update this token with every release.
    await import('./boot.js?v=20261030-v320');
    applicationBooted = true;
    // Boot's dependency graph has now registered lifecycle hooks. If the SDK won the race,
    // initialize by ESM export now; if it resolves later, the bridge callback does the same.
    if (supabaseBridgeReady) void initializeAuthServiceModuleAfterBoot();
} catch (error) {
    window.__TP_BOOT_ERROR__ = error;
    console.error('[RuntimeEntry] Inisialisasi aplikasi gagal:', error);
    throw error;
}
