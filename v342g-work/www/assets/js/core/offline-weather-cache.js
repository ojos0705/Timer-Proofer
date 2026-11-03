/**
 * Read and persist the device-local state used by forced-offline weather UI.
 * Storage access and cache contents are both untrusted in browser/WebView contexts.
 */
function resolveStorage(storageOverride) {
    return storageOverride === undefined ? globalThis.localStorage : storageOverride;
}

function isRecord(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function readForcedOfflinePreference(storageOverride) {
    try {
        return resolveStorage(storageOverride)?.getItem('app_force_offline') === 'true';
    } catch (error) {
        console.warn('[OfflineWeatherCache] Gagal membaca preferensi mode luring.', error);
        return false;
    }
}

export function readOfflineWeatherValue(key, storageOverride) {
    try {
        return resolveStorage(storageOverride)?.getItem(String(key)) ?? null;
    } catch (error) {
        console.warn(`[OfflineWeatherCache] Gagal membaca nilai "${key}".`, error);
        return null;
    }
}

export function readOfflineWeatherCache(storageOverride) {
    try {
        const raw = resolveStorage(storageOverride)?.getItem('donut_weather_cache');
        if (!raw) return Object.freeze({ cache: Object.freeze({}), hasSavedCache: false });

        const parsed = JSON.parse(raw);
        if (!isRecord(parsed)) {
            return Object.freeze({ cache: Object.freeze({}), hasSavedCache: false });
        }

        return Object.freeze({ cache: parsed, hasSavedCache: true });
    } catch (error) {
        console.warn('[OfflineWeatherCache] Gagal membaca cache cuaca.', error);
        return Object.freeze({ cache: Object.freeze({}), hasSavedCache: false });
    }
}

export function writeOfflineWeatherCache(cache, storageOverride) {
    try {
        const storage = resolveStorage(storageOverride);
        if (!storage || typeof storage.setItem !== 'function') return false;
        storage.setItem('donut_weather_cache', JSON.stringify(isRecord(cache) ? cache : {}));
        return true;
    } catch (error) {
        console.warn('[OfflineWeatherCache] Gagal menyimpan cache cuaca.', error);
        return false;
    }
}

export function splitWeatherLocationName(value) {
    if (typeof value !== 'string') return Object.freeze(['', '']);
    const [first = '', ...rest] = value.split('|');
    return Object.freeze([first.trim(), rest.join('|').trim()]);
}
