/**
 * [AI-GENERATED][REFACTOR][V34]
 * Canonical Supabase client + authentication/session lifecycle owner.
 * Keeps credential UI in app-core while centralizing session side effects.
 */

import { initializeSupabaseSdkBridge } from './supabase-runtime.js';

const SUPABASE_URL = 'https://rshnirlkjicnklrybjpf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzaG5pcmxramljbmtscnlianBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjM0NjAsImV4cCI6MjA5OTY5OTQ2MH0.v5FXEfIQ1hLDLQmWgS9tv0f6OD2VqMdgius_cRjV9FI';

// [AI-GENERATED][SECURITY][V33]
// The Supabase anon key is a public client key by design. The truncated literal above
// must never be used to initialize the client; prefer the key supplied by the existing app config.

const EXISTING_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// [AI-GENERATED][REFACTOR][V54] Keep one stable client reference after initialization.
// Feature modules may retain the returned client without being affected by accidental
// reassignment of window.supabase by legacy compatibility code.
let supabaseClient = null;

function getSupabaseClient() {
    if (supabaseClient?.auth && typeof supabaseClient.from === 'function') {
        return supabaseClient;
    }

    if (window.supabase?.auth && typeof window.supabase.from === 'function') {
        supabaseClient = window.supabase;
        return supabaseClient;
    }

    const createClient = window.supabase?.createClient;
    if (typeof createClient !== 'function') {
        console.error('[AuthService] Supabase SDK tidak tersedia.');
        return null;
    }

    // Preserve the project's existing public Supabase configuration.
    supabaseClient = createClient(SUPABASE_URL, EXISTING_SUPABASE_ANON_KEY);
    window.supabase = supabaseClient;
    return supabaseClient;
}

// [AI-GENERATED][ES6 MODULE][V257] Retry SDK initialization lazily when the app booted offline.
async function getSupabaseClientReady() {
    let client = getSupabaseClient();
    if (client?.auth && typeof client.from === 'function') return client;

    try {
        await initializeSupabaseSdkBridge();
        window.__TP_SUPABASE_SDK_STATUS__ = 'ready';
        delete window.__TP_SUPABASE_SDK_ERROR__;
    } catch (cause) {
        window.__TP_SUPABASE_SDK_STATUS__ = 'unavailable';
        window.__TP_SUPABASE_SDK_ERROR__ = cause;
        const error = new Error('SDK Supabase belum tersedia. Periksa koneksi internet lalu coba lagi.', { cause });
        error.code = 'SUPABASE_SDK_UNAVAILABLE';
        throw error;
    }

    client = getSupabaseClient();
    if (!client?.auth || typeof client.from !== 'function') {
        const error = new Error('Klien Supabase belum berhasil diinisialisasi.');
        error.code = 'SUPABASE_CLIENT_NOT_READY';
        throw error;
    }

    // The first auth call may occur after an offline boot; bind lifecycle at the moment
    // the real SDK client becomes available instead of permanently missing auth events.
    bindAuthLifecycle();
    return client;
}

let lifecycleBound = false;
let lastHandledSessionId = null;
let lifecycleEpoch = 0;
// [AI-GENERATED][ROBUSTNESS][V83] Single-flight guard for the async signed-in
// lifecycle. A failed hook must remain retryable; concurrent duplicate auth
// events for the same session must not start duplicate sync pipelines.
let activeSignedInSessionId = null;
let activeSignedInPromise = null;
// [AI-GENERATED][ROBUSTNESS][V85] Single-flight guard for signed-out cleanup.
// Duplicate SIGNED_OUT callbacks must not run concurrent realtime/timer resets.
let activeSignedOutPromise = null;
// [AI-GENERATED][ROBUSTNESS][V129] Canonical sign-out single-flight guard.
// Every destructive/logout caller must share one Supabase signOut operation.
let activeSignOutPromise = null;

function setAuthUi(session) {
    const loggedIn = Boolean(session?.user);
    document.body?.classList.toggle('logged-in', loggedIn);
    document.body?.classList.toggle('logged-out', !loggedIn);
    document.body?.classList.remove('auth-pending');
    window.__TP_AUTH_UI_RESOLVED__ = true;

    const authWrapper = document.getElementById('auth-wrapper');
    const appContainer = document.getElementById('app-container');
    if (authWrapper) authWrapper.style.display = loggedIn ? 'none' : 'flex';
    if (appContainer) appContainer.style.display = loggedIn ? 'flex' : '';
}

async function handleSignedIn(session, epoch) {
    if (!session?.user || epoch !== lifecycleEpoch) return;

    // [AI-GENERATED][ROBUSTNESS][V86] A new signed-in lifecycle must supersede
    // any in-flight signed-out cleanup. signOut() already increments the epoch,
    // but SIGNED_IN itself does not; bump it here so the old cleanup becomes stale
    // before it can reset state belonging to the new session.
    if (activeSignedOutPromise) {
        lifecycleEpoch += 1;
        epoch = lifecycleEpoch;
    }

    const sessionId = session.user.id;
    if (lastHandledSessionId === sessionId) {
        setAuthUi(session);
        return;
    }

    if (activeSignedInSessionId === sessionId && activeSignedInPromise) {
        return activeSignedInPromise;
    }

    activeSignedInSessionId = sessionId;
    const signedInPromise = (async () => {
        // [AI-GENERATED][ROBUSTNESS][V83] Re-check before every side effect so
        // logout or another session cannot inherit a stale signed-in pipeline.
        if (epoch !== lifecycleEpoch) return;

        setAuthUi(session);

        // [AI-GENERATED][ONBOARDING PREVIEW][V326] Do not auto-dismiss the
        // walkthrough when an existing session is restored during explicit QA preview.
        const onboardingPreviewActive = window.appOnboardingWalkthrough?.isPreviewActive?.() === true;
        if (!onboardingPreviewActive) {
            try {
                localStorage.setItem('tp_onboarding_seen', 'true');
            } catch (error) {
                console.warn('[AuthService] Gagal menyimpan status onboarding:', error);
            }
            window.appOnboardingWalkthrough?.hide?.();
        }

        if (epoch !== lifecycleEpoch) return;

        if (typeof window.__TPAuthLifecycleHooks?.onSignedIn === 'function') {
            await window.__TPAuthLifecycleHooks.onSignedIn(session, epoch);
        }

        // [AI-GENERATED][ROBUSTNESS][V83] Mark the session handled only after
        // the complete hook succeeds and the lifecycle is still current.
        // Transient sync failures therefore remain retryable on a later auth event.
        if (epoch === lifecycleEpoch) {
            lastHandledSessionId = sessionId;
        }
    })();

    activeSignedInPromise = signedInPromise;

    try {
        return await signedInPromise;
    } catch (error) {
        // [AI-GENERATED][ROBUSTNESS][V83] Never poison the session dedupe marker
        // when the lifecycle hook fails; a later SIGNED_IN can retry safely.
        if (lastHandledSessionId === sessionId) {
            lastHandledSessionId = null;
        }
        throw error;
    } finally {
        if (activeSignedInSessionId === sessionId && activeSignedInPromise === signedInPromise) {
            activeSignedInSessionId = null;
            activeSignedInPromise = null;
        }
    }
}
async function handleSignedOut() {
    if (activeSignedOutPromise) return activeSignedOutPromise;

    lifecycleEpoch += 1;
    const epoch = lifecycleEpoch;
    lastHandledSessionId = null;
    // [AI-GENERATED][ROBUSTNESS][V84] Clear the signed-in single-flight guard
    // at the canonical SIGNED_OUT boundary. The V83 promise-identity cleanup
    // prevents an obsolete promise from clearing a newer guard later.
    activeSignedInSessionId = null;
    activeSignedInPromise = null;
    setAuthUi(null);

    const signedOutPromise = (async () => {
        try {
            // [AI-GENERATED][ROBUSTNESS][V85] Signed-out cleanup is lifecycle-aware.
            // A rapid re-login may supersede this cleanup; in that case the old
            // reset must not wipe state belonging to the newly signed-in session.
            if (epoch !== lifecycleEpoch) return;
            if (typeof window.__TPAuthLifecycleHooks?.onSignedOut === 'function') {
                await window.__TPAuthLifecycleHooks.onSignedOut(epoch);
            }
        } catch (error) {
            console.warn('[AuthService] Cleanup logout gagal:', error);
        }
    })();

    activeSignedOutPromise = signedOutPromise;
    try {
        return await signedOutPromise;
    } finally {
        if (activeSignedOutPromise === signedOutPromise) {
            activeSignedOutPromise = null;
        }
    }
}

async function handlePasswordRecovery() {
    const newPassword = prompt('Masukkan password baru Anda:');
    if (!newPassword) return;

    // [AI-GENERATED][REFACTOR][V53] Password recovery also uses the canonical auth boundary.
    const { error } = await AuthService.updateUser({ password: newPassword });
    if (error) {
        alert('Gagal memperbarui password: ' + error.message);
        return;
    }

    alert('Password berhasil diperbarui! Silakan login kembali.');
    window.location.hash = '';
    window.location.reload();
}

function bindAuthLifecycle() {
    const client = getSupabaseClient();
    if (!client?.auth || lifecycleBound) return client;
    lifecycleBound = true;

    client.auth.onAuthStateChange((event, session) => {
        const epoch = lifecycleEpoch;
        setTimeout(async () => {
            try {
                // [AI-GENERATED][ROBUSTNESS][V115] Auth events are dispatched
                // asynchronously with setTimeout(0). Ignore delayed UI work from
                // an obsolete lifecycle epoch (for example PASSWORD_RECOVERY
                // arriving just before logout).
                if (epoch !== lifecycleEpoch && event !== 'SIGNED_OUT') return;

                if (event === 'PASSWORD_RECOVERY') {
                    await handlePasswordRecovery();
                    return;
                }
                if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
                    await handleSignedIn(session, epoch);
                    return;
                }
                if (event === 'TOKEN_REFRESHED') {
                    if (session && epoch === lifecycleEpoch) setAuthUi(session);
                    return;
                }
                if (event === 'SIGNED_OUT') {
                    await handleSignedOut();
                }
            } catch (error) {
                console.error('[AuthService] Auth event gagal:', error);
            }
        }, 0);
    });

    return client;
}

export const AuthService = Object.freeze({
    getClient: getSupabaseClient,
    getSession: async () => {
        let client = getSupabaseClient();
        if (!client?.auth) {
            try { client = await getSupabaseClientReady(); }
            catch (error) { console.warn('[AuthService] Session tidak dapat diperiksa:', error); return null; }
        }
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        return data?.session || null;
    },
    // [AI-GENERATED][ROBUSTNESS][V279] Read the locally cached auth session
    // for owner-bound UI/storage guards. Unlike getUser(), this does not make
    // a server verification request, preserving offline local saves.
    getSessionUser: async () => {
        const session = await AuthService.getSession();
        return session?.user || null;
    },
    // [AI-GENERATED][REFACTOR][V50] Canonical sign-out boundary. Consumers no longer
    // need to depend on the mutable window.supabase reference for normal logout.
    // [AI-GENERATED][ROBUSTNESS][V82] Invalidate an in-flight signed-in
    // lifecycle hook immediately when logout is requested. Supabase emits
    // SIGNED_OUT asynchronously; waiting for that event leaves a window where
    // an older sync/restore pipeline could continue after the user has tapped
    // logout.
    signOut: () => {
        // [AI-GENERATED][ROBUSTNESS][V129] Share an in-flight sign-out request
        // across logout/account-deletion callers instead of issuing concurrent
        // Supabase signOut() calls and advancing the lifecycle epoch repeatedly.
        if (activeSignOutPromise) return activeSignOutPromise;

        lifecycleEpoch += 1;
        lastHandledSessionId = null;
        activeSignedInSessionId = null;
        activeSignedOutPromise = null;

        // [AI-GENERATED][BUG FIX][V204] Track the promise returned by `finally`,
        // not the inner operation promise. Comparing against the inner promise
        // can never identify the active wrapper and the truthy fallback clears
        // the guard unconditionally. Identity-based cleanup ensures an older
        // completion cannot clear a newer in-flight sign-out operation.
        // [AI-GENERATED][ROBUSTNESS][V257] Preserve the synchronous fast path so
        // the established single-flight contract invokes signOut immediately when ready.
        const existingClient = getSupabaseClient();
        const signOutOperation = (async () => {
            const client = existingClient?.auth
                ? existingClient
                : await getSupabaseClientReady();
            const { error } = await client.auth.signOut();
            if (error) throw error;
            return true;
        })();

        let trackedSignOutPromise;
        trackedSignOutPromise = signOutOperation.finally(() => {
            if (activeSignOutPromise === trackedSignOutPromise) {
                activeSignOutPromise = null;
            }
        });
        activeSignOutPromise = trackedSignOutPromise;
        return trackedSignOutPromise;
    },
    // [AI-GENERATED][REFACTOR][V53] Authentication API boundary. UI modules call
    // AuthService instead of reaching through the mutable global Supabase object.
    verifyOtp: async (params) => {
        const client = await getSupabaseClientReady();
        if (!client?.auth) throw new Error('Koneksi autentikasi Supabase belum siap.');
        return client.auth.verifyOtp(params);
    },
    signInWithOAuth: async (provider, options = {}) => {
        const client = await getSupabaseClientReady();
        if (!client?.auth) throw new Error('Koneksi autentikasi Supabase belum siap.');
        return client.auth.signInWithOAuth({ provider, options });
    },
    signInWithOtp: async (params) => {
        const client = await getSupabaseClientReady();
        if (!client?.auth) throw new Error('Koneksi autentikasi Supabase belum siap.');
        return client.auth.signInWithOtp(params);
    },
    resetPasswordForEmail: async (email, options = {}) => {
        const client = await getSupabaseClientReady();
        if (!client?.auth) throw new Error('Koneksi autentikasi Supabase belum siap.');
        return client.auth.resetPasswordForEmail(email, options);
    },
    signUp: async (params) => {
        const client = await getSupabaseClientReady();
        if (!client?.auth) throw new Error('Koneksi autentikasi Supabase belum siap.');
        return client.auth.signUp(params);
    },
    signInWithPassword: async (params) => {
        const client = await getSupabaseClientReady();
        if (!client?.auth) throw new Error('Koneksi autentikasi Supabase belum siap.');
        return client.auth.signInWithPassword(params);
    },
    updateUser: async (attributes) => {
        const client = await getSupabaseClientReady();
        if (!client?.auth) throw new Error('Koneksi autentikasi Supabase belum siap.');
        return client.auth.updateUser(attributes);
    },
    // [AI-GENERATED][REFACTOR][V52] Canonical current-user boundary for destructive account flows.
    getUser: async () => {
        const client = await getSupabaseClientReady();
        if (!client?.auth) throw new Error('Koneksi autentikasi Supabase belum siap.');
        const { data, error } = await client.auth.getUser();
        if (error) throw error;
        return data?.user || null;
    },
    // [AI-GENERATED][REFACTOR][V52] Canonical RPC boundary for account-level operations.
    rpc: async (functionName, args = undefined) => {
        const client = await getSupabaseClientReady();
        if (!client?.rpc) throw new Error('Koneksi Supabase belum siap.');
        const result = args === undefined ? await client.rpc(functionName) : await client.rpc(functionName, args);
        if (result?.error) throw result.error;
        return result?.data;
    },
    // [AI-GENERATED][ROBUSTNESS][V82] Expose a read-only epoch check so
    // lifecycle consumers can abort work that became stale while awaiting
    // network/storage operations.
    // [AI-GENERATED][ROBUSTNESS][V125] Read-only lifecycle token for
    // consumers that must bind multi-await work to the active auth session.
    getLifecycleEpoch: () => lifecycleEpoch,
    isLifecycleEpochCurrent: (epoch) => epoch === lifecycleEpoch,
    init: bindAuthLifecycle,
    setAuthUi
});

// [AI-GENERATED][ES6 MODULE CLEANUP][V273] AuthService is consumed through named ESM imports.
window.supabase = getSupabaseClient();
bindAuthLifecycle();
