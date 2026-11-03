/**
 * [AI-GENERATED][ROBUSTNESS][V222] Result policy for full persistence cleanup.
 * A destructive account cleanup is complete only when local storage and every
 * required persistence backend report success. A partial clear must be visible
 * to the caller rather than masquerading as a successful reset.
 */
export function isPersistenceClearComplete({
    localCleared,
    nativeClearRequired = false,
    nativeCleared = false,
} = {}) {
    return localCleared === true
        && (nativeClearRequired !== true || nativeCleared === true);
}


/**
 * [AI-GENERATED][ROBUSTNESS][V225] A key removal is complete only when the
 * local backend and each active native persistence backend confirm removal.
 * This intentionally mirrors the full-clear policy so callers can surface
 * partial cleanup instead of accidentally restoring stale timer state later.
 */
export function isPersistenceRemoveComplete({
    localRemoved,
    nativeRemoveRequired = false,
    nativeRemoved = false,
} = {}) {
    return localRemoved === true
        && (nativeRemoveRequired !== true || nativeRemoved === true);
}


/**
 * [AI-GENERATED][ROBUSTNESS][V228] A mirrored write is durable only after every
 * active backend confirms it. Browser mode requires LocalStorage; native mode
 * additionally requires Capacitor Preferences so failed native writes remain
 * retryable instead of being reported as success from the local mirror alone.
 */
export function isPersistenceWriteComplete({
    localSaved,
    nativeWriteRequired = false,
    nativeSaved = false,
} = {}) {
    return localSaved === true
        && (nativeWriteRequired !== true || nativeSaved === true);
}
