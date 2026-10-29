/**
 * [AI-GENERATED][REFACTOR] Canonical persistence service for PWA + Capacitor.
 * Keeps LocalStorage as the synchronous browser fallback and mirrors supported
 * keys to Capacitor Preferences when running natively.
 *
 * IMPORTANT: This service does not change existing storage keys. It centralizes
 * access only, so existing user data remains compatible.
 */

import { NativeCapacitorService } from './native-capacitor-service.js';
import { createKeyMutationTracker, reconcileNativeRead } from './storage-read-consistency.js';
import { isPersistenceClearComplete, isPersistenceRemoveComplete, isPersistenceWriteComplete } from './storage-clear-result.js';
import { flushPersistenceQueueUntilStable } from './storage-flush.js';

// [AI-GENERATED][ROBUSTNESS][V97] Preferences is a native persistence bridge.
// In PWA/browser mode the Capacitor web proxy is deliberately not used;
// LocalStorage remains the canonical fallback and avoids bridge-only errors.
function getNativePreferences() {
    if (!NativeCapacitorService.isNativePlatform()) return null;
    return NativeCapacitorService.getPlugin('Preferences');
}

// [AI-GENERATED][ROBUSTNESS][V53] Serialize native persistence per key.
// Capacitor Preferences writes are asynchronous; without ordering, a slower
// older write can finish after a newer write and resurrect stale state.
const nativeWriteChains = new Map();
// [AI-GENERATED][ROBUSTNESS][V228] Remember completed persistence failures as well as
// in-flight queue failures, so flush() cannot return success after a failed
// local or native write has already left the pending queue.
const failedPersistenceKeys = new Set();
// [AI-GENERATED][ROBUSTNESS][V212] Track only keys with a native read in flight;
// state is discarded when the last concurrent read settles (no unbounded key map).
const nativeReadMutations = createKeyMutationTracker();

// [AI-GENERATED][ROBUSTNESS][V55] Global native reset barrier. Any write/remove
// started while account cleanup is in progress waits until Preferences.clear()
// finishes, preventing post-clear writes from resurrecting deleted data.
let nativeResetBarrier = Promise.resolve();
// [AI-GENERATED][ROBUSTNESS][V170] Invalidates native reads that overlap an
// account-wide clear, so a late Preferences.get() cannot hydrate deleted data.
let nativeResetEpoch = 0;

// [AI-GENERATED][ROBUSTNESS][V212] Keep native fallback useful when the browser
// storage implementation is temporarily unavailable; never let a localStorage
// exception erase a valid value already recovered from Capacitor Preferences.
function readLocalValueForNativeFallback(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`[StorageService] LocalStorage recheck gagal untuk "${key}":`, error);
        return undefined;
    }
}

function writeLocalValueFromNativeFallback(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn(`[StorageService] LocalStorage HYDRATE gagal untuk "${key}":`, error);
    }
}

function enqueueNativeWrite(key, operation) {
    const previous = nativeWriteChains.get(key) || Promise.resolve();
    // [AI-GENERATED][BUG FIX][V169] Capture the barrier at enqueue time. Reading
    // the mutable barrier when the queued callback starts can make a pre-clear
    // write wait for a CLEAR operation that is itself waiting for that write.
    // That cycle deadlocks native persistence. Writes enqueued after CLEAR starts
    // capture the new barrier and remain ordered behind the reset as intended.
    const barrierAtEnqueue = nativeResetBarrier;
    const next = previous
        .catch(() => undefined)
        .then(() => barrierAtEnqueue)
        .then(operation);

    nativeWriteChains.set(key, next);
    // [AI-GENERATED][ROBUSTNESS][V161] Handle both settlement paths on the
    // cleanup branch. Promise.finally() creates a new Promise that would reject
    // unobserved when a native Preferences operation fails, even if the caller
    // handles `next`; that produced noisy unhandledrejection events in WebView.
    const cleanup = () => {
        if (nativeWriteChains.get(key) === next) nativeWriteChains.delete(key);
    };
    void next.then(cleanup, cleanup);
    return next;
}

// [AI-GENERATED][REFACTOR][V58] Removed the unused global queue helper.
// Account-wide reset coordination is handled directly by nativeResetBarrier.

async function getString(key, defaultValue = null) {
    if (!key) return defaultValue;

    // [AI-GENERATED][ROBUSTNESS][V53] LocalStorage is the synchronous write-through
    // source used by existing app code, so prefer it when present. Native Preferences
    // remains a fallback for native-only legacy data. This prevents stale native data
    // from masking a newer browser-side value.
    try {
        const localValue = localStorage.getItem(key);
        if (localValue !== null) return localValue;
    } catch (error) {
        console.warn(`[StorageService] LocalStorage GET gagal untuk "${key}":`, error);
    }

    const preferences = getNativePreferences();
    if (preferences) {
        const readGuard = nativeReadMutations.beginRead(key);
        try {
            const readEpoch = nativeResetEpoch;
            // [AI-GENERATED][ROBUSTNESS][V70] A LocalStorage remove may become
            // visible before its asynchronous native remove finishes. Wait for
            // the current key chain and reset barrier before falling back to
            // native data; otherwise a just-cleared value could be resurrected.
            await nativeResetBarrier;
            const pendingKeyWrite = nativeWriteChains.get(key);
            if (pendingKeyWrite) await pendingKeyWrite.catch(() => undefined);

            const result = await preferences.get({ key });
            // [AI-GENERATED][BUG FIX][V212] Reconcile after the async native read.
            // Both an account reset and a per-key set/remove can happen while
            // Preferences.get() is pending; never hydrate its stale snapshot in
            // those cases. Also re-read LocalStorage before hydration to honor
            // synchronous legacy writes that do not go through StorageService.
            if (readEpoch !== nativeResetEpoch) {
                await nativeResetBarrier.catch(() => undefined);
                return reconcileNativeRead({
                    key,
                    nativeValue: result?.value,
                    defaultValue,
                    wasInvalidated: true,
                    readLocalValue: readLocalValueForNativeFallback,
                    writeLocalValue: writeLocalValueFromNativeFallback,
                });
            }

            return reconcileNativeRead({
                key,
                nativeValue: result?.value,
                defaultValue,
                wasInvalidated: readGuard.wasMutated(),
                readLocalValue: readLocalValueForNativeFallback,
                writeLocalValue: writeLocalValueFromNativeFallback,
            });
        } catch (error) {
            console.warn(`[StorageService] Native GET gagal untuk "${key}":`, error);
        } finally {
            readGuard.finish();
        }
    }

    return defaultValue;
}

function getStringSync(key, defaultValue = null) {
    if (!key) return defaultValue;
    try {
        const value = localStorage.getItem(key);
        return value !== null ? value : defaultValue;
    } catch (error) {
        console.warn(`[StorageService] LocalStorage sync GET gagal untuk "${key}":`, error);
        return defaultValue;
    }
}

async function setString(key, value) {
    if (!key) return false;

    const normalizedValue = value === null || value === undefined ? '' : String(value);
    // [AI-GENERATED][ROBUSTNESS][V212] Invalidate native read snapshots before
    // the synchronous write-through mutation becomes visible.
    nativeReadMutations.noteMutation(key);
    let localSaved = false;
    let nativeSaved = false;

    try {
        localStorage.setItem(key, normalizedValue);
        localSaved = true;
    } catch (error) {
        console.warn(`[StorageService] LocalStorage SET gagal untuk "${key}":`, error);
    }

    const preferences = getNativePreferences();
    const nativeWriteRequired = Boolean(preferences);
    if (preferences) {
        try {
            if (typeof preferences.set !== 'function') {
                throw new TypeError('Capacitor Preferences tidak menyediakan set().');
            }
            // [AI-GENERATED][ROBUSTNESS][V79] The reset barrier is enforced by
            // enqueueNativeWrite at execution time, closing the check-then-enqueue
            // race with Preferences.clear().
            await enqueueNativeWrite(key, async () => {
                await preferences.set({ key, value: normalizedValue });
                nativeSaved = true;
            });
        } catch (error) {
            console.warn(`[StorageService] Native SET gagal untuk "${key}":`, error);
        }
    }

    // [AI-GENERATED][BUG FIX][V228] LocalStorage success alone is insufficient
    // on native: ProofingService uses this result to decide whether a failed
    // native snapshot must remain queued for a later retry.
    const writeComplete = isPersistenceWriteComplete({
        localSaved,
        nativeWriteRequired,
        nativeSaved,
    });
    if (writeComplete) failedPersistenceKeys.delete(key);
    else failedPersistenceKeys.add(key);
    return writeComplete;
}

async function remove(key) {
    if (!key) return false;

    // [AI-GENERATED][ROBUSTNESS][V212] A pending native GET must not resurrect
    // this key after its synchronous deletion.
    nativeReadMutations.noteMutation(key);
    let localRemoved = false;

    try {
        localStorage.removeItem(key);
        localRemoved = true;
    } catch (error) {
        console.warn(`[StorageService] LocalStorage REMOVE gagal untuk "${key}":`, error);
    }

    const preferences = getNativePreferences();
    const nativeRemoveRequired = Boolean(preferences);
    let nativeRemoved = false;
    if (preferences && typeof preferences.remove === 'function') {
        try {
            // [AI-GENERATED][ROBUSTNESS][V79] Deletion participates in the same
            // execution-time barrier as writes, so it cannot race with an
            // account-wide reset.
            await enqueueNativeWrite(key, async () => {
                await preferences.remove({ key });
                nativeRemoved = true;
            });
        } catch (error) {
            console.warn(`[StorageService] Native REMOVE gagal untuk "${key}":`, error);
        }
    } else if (nativeRemoveRequired) {
        // [AI-GENERATED][ROBUSTNESS][V225] Missing native remove capability is
        // a partial persistence failure, not a successful deletion.
        console.warn(`[StorageService] Preferences tidak menyediakan remove() untuk "${key}".`);
    }

    // [AI-GENERATED][BUG FIX][V225] Older callers could not tell that LocalStorage
    // had been updated while the native Preferences value remained recoverable.
    const removalComplete = isPersistenceRemoveComplete({
        localRemoved,
        nativeRemoveRequired,
        nativeRemoved,
    });
    if (removalComplete) failedPersistenceKeys.delete(key);
    else failedPersistenceKeys.add(key);
    return removalComplete;
}

// [AI-GENERATED][REFACTOR][V52] Canonical full local persistence reset.
// Keeps account-deletion cleanup behind the same storage boundary instead of
// mixing direct localStorage.clear() with direct Capacitor Preferences access.
async function clear() {
    let localCleared = false;
    let nativeCleared = false;

    try {
        localStorage.clear();
        localCleared = true;
    } catch (error) {
        console.warn('[StorageService] LocalStorage CLEAR gagal:', error);
    }

    const preferences = getNativePreferences();
    const nativeClearRequired = Boolean(preferences);
    if (nativeClearRequired && typeof preferences.clear === 'function') {
        try {
            // [AI-GENERATED][BUG FIX][V169] Snapshot pre-existing writes
            // synchronously before publishing the new barrier. The reset waits
            // only for work that was already queued; writes enqueued afterwards
            // capture resetOperation as their barrier and must not be included in
            // this wait set, or CLEAR and those writes would wait on each other.
            const pending = [...nativeWriteChains.entries()]
                .filter(([chainKey]) => chainKey !== '__TP_STORAGE_GLOBAL__')
                .map(([, chain]) => chain.catch(() => undefined));
            const previousBarrier = nativeResetBarrier;
            // [AI-GENERATED][ROBUSTNESS][V170] Advance before publishing the
            // asynchronous barrier, invalidating native reads already in flight.
            nativeResetEpoch += 1;
            const resetOperation = previousBarrier.then(async () => {
                await Promise.all(pending);
                await preferences.clear();
                nativeCleared = true;
            });
            nativeResetBarrier = resetOperation.catch(() => undefined);
            await resetOperation;
        } catch (error) {
            console.warn('[StorageService] Native Preferences CLEAR gagal:', error);
        }
    } else if (nativeClearRequired) {
        // [AI-GENERATED][ROBUSTNESS][V222] Do not report a complete account
        // cleanup if native storage exists but does not expose the required clear API.
        console.warn('[StorageService] Preferences tersedia tetapi API clear() tidak tersedia.');
    }

    // [AI-GENERATED][BUG FIX][V222] The previous OR result reported success when
    // only one backend cleared, which could leave a deleted user's data recoverable
    // from the other backend. Require every active backend to confirm the reset.
    const clearComplete = isPersistenceClearComplete({
        localCleared,
        nativeClearRequired,
        nativeCleared,
    });
    if (clearComplete) failedPersistenceKeys.clear();
    return clearComplete;
}

// [AI-GENERATED][ROBUSTNESS][V81] Wait for the currently queued native
// operations for one key. This is intentionally narrower than clear(): it lets
// lifecycle/domain services establish a deterministic persistence barrier without
// exposing the internal queue map. If a key has no queued operation, wait for an
// account-wide reset already in progress before returning.
async function flush(key) {
    // [AI-GENERATED][BUG FIX][V229] Wait through writes appended while an older
    // write settles. This matters when timer snapshots and a lifecycle flush race.
    return flushPersistenceQueueUntilStable({
        key,
        getPendingWrite: (storageKey) => nativeWriteChains.get(storageKey) || null,
        getResetBarrier: () => nativeResetBarrier,
        hasFailed: (storageKey) => failedPersistenceKeys.has(storageKey),
    });
}

async function getJSON(key, defaultValue = null) {
    const raw = await getString(key, null);
    if (!raw) return defaultValue;

    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn(`[StorageService] JSON rusak untuk "${key}":`, error);
        return defaultValue;
    }
}

function getJSONSync(key, defaultValue = null) {
    const raw = getStringSync(key, null);
    if (!raw) return defaultValue;

    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn(`[StorageService] JSON sync rusak untuk "${key}":`, error);
        return defaultValue;
    }
}

async function setJSON(key, value) {
    return setString(key, JSON.stringify(value));
}

export const StorageService = Object.freeze({
    getString,
    getStringSync,
    setString,
    remove,
    flush,
    clear,
    getJSON,
    getJSONSync,
    setJSON
});

// [AI-GENERATED][COMPATIBILITY] Optional global facade for legacy dynamic callers.
// [AI-GENERATED][ES6 MODULE CLEANUP][V273] StorageService is consumed through named ESM imports.
