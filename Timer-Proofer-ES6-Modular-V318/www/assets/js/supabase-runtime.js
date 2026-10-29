/**
 * [AI-GENERATED][ES6 MODULE][V257]
 * Load the Supabase browser SDK as an ES module and install the smallest possible
 * compatibility bridge for legacy callers that still use window.supabase.
 * Failed loads are retryable; no remote SDK failure should block offline app boot.
 */

const pendingLoads = new WeakMap();

function isSupabaseClient(value) {
    return Boolean(value?.auth && typeof value.from === 'function');
}

function hasCreateClient(value) {
    return typeof value?.createClient === 'function';
}

/**
 * Initialize the module SDK bridge once per window-like target.
 * `loadSdk` is injectable for deterministic unit tests; production uses the import map.
 */
export async function initializeSupabaseSdkBridge({
    target = globalThis.window,
    loadSdk = () => import('@supabase/supabase-js')
} = {}) {
    if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
        throw new TypeError('Objek window untuk inisialisasi Supabase tidak tersedia.');
    }

    const existing = target.supabase;
    if (isSupabaseClient(existing)) {
        return Object.freeze({ status: 'client-ready', client: existing });
    }
    if (hasCreateClient(existing)) {
        return Object.freeze({ status: 'bridge-ready', createClient: existing.createClient });
    }

    const activeLoad = pendingLoads.get(target);
    if (activeLoad) return activeLoad;

    const loading = Promise.resolve()
        .then(() => loadSdk())
        .then((sdk) => {
            // A parallel legacy initializer may have installed the client while the SDK loaded.
            if (isSupabaseClient(target.supabase)) {
                return Object.freeze({ status: 'client-ready', client: target.supabase });
            }
            if (hasCreateClient(target.supabase)) {
                return Object.freeze({ status: 'bridge-ready', createClient: target.supabase.createClient });
            }
            if (!hasCreateClient(sdk)) {
                throw new TypeError('Modul @supabase/supabase-js tidak mengekspor createClient().');
            }

            // Preserve unrelated legacy namespace properties, replacing only the SDK factory.
            target.supabase = Object.assign({}, target.supabase || {}, { createClient: sdk.createClient });
            return Object.freeze({ status: 'bridge-ready', createClient: sdk.createClient });
        })
        .catch((error) => {
            // [AI-GENERATED][ROBUSTNESS][V257] Remove a rejected promise so a later online/auth attempt can retry.
            pendingLoads.delete(target);
            throw error;
        });

    pendingLoads.set(target, loading);
    return loading;
}

export { isSupabaseClient };
