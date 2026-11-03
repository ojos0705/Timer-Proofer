/**
 * [AI-GENERATED][ROBUSTNESS][V227] Remove profile-owned storage keys without
 * masking partial cleanup. Each key is attempted independently so one failed
 * Preferences/LocalStorage operation cannot prevent cleanup of later keys.
 */
export async function removeStorageKeys(keys, removeKey) {
    if (!Array.isArray(keys)) {
        throw new TypeError('keys harus berupa array.');
    }
    if (typeof removeKey !== 'function') {
        throw new TypeError('removeKey harus berupa fungsi.');
    }

    const failedKeys = [];
    for (const key of keys) {
        if (typeof key !== 'string' || !key.trim()) {
            failedKeys.push(key);
            continue;
        }

        try {
            // StorageService deliberately returns a boolean, not a best-effort hint.
            if (await removeKey(key) !== true) failedKeys.push(key);
        } catch {
            failedKeys.push(key);
        }
    }

    return Object.freeze({
        success: failedKeys.length === 0,
        failedKeys: Object.freeze(failedKeys),
        attempted: keys.length,
    });
}
