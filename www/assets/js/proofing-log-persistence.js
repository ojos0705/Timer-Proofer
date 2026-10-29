/**
 * [AI-GENERATED][ROBUSTNESS][V241] Idempotent merge for proofing log retries.
 * StorageService may commit to LocalStorage while a native Preferences write
 * fails. The log remains pending for retry, so each entry needs a stable ID to
 * prevent the already-committed local copy from being appended a second time.
 */
let logEntrySequence = 0;

export function createProofingLogEntry(entry = {}, now = Date.now()) {
    const timestamp = entry.timestamp || now;
    const randomPart = Math.random().toString(36).slice(2, 10);

    return {
        ...entry,
        timestamp,
        __tpPersistenceId: `proofing-log-${now}-${++logEntrySequence}-${randomPart}`
    };
}

export function mergePendingProofingLogEntries(logs, pendingEntries, maxEntries = 50) {
    const merged = Array.isArray(logs) ? [...logs] : [];
    const knownIds = new Set(
        merged
            .map((entry) => entry?.__tpPersistenceId)
            .filter((id) => typeof id === 'string' && id.length > 0)
    );

    for (const entry of Array.isArray(pendingEntries) ? pendingEntries : []) {
        const id = entry?.__tpPersistenceId;
        // All new queued entries carry IDs. Legacy entries without IDs remain
        // compatible and are not heuristically deduplicated by their content.
        if (typeof id === 'string' && id.length > 0 && knownIds.has(id)) continue;
        merged.push(entry);
        if (typeof id === 'string' && id.length > 0) knownIds.add(id);
    }

    const safeLimit = Number.isFinite(maxEntries) && maxEntries >= 0
        ? Math.floor(maxEntries)
        : 50;
    if (safeLimit === 0) return [];
    return merged.length > safeLimit ? merged.slice(-safeLimit) : merged;
}
