// [AI-GENERATED][REFACTOR] Canonical proofing domain persistence and state service.
import { StorageService } from './storage-service.js';
import { createProofingLogEntry, mergePendingProofingLogEntries } from './proofing-log-persistence.js';

const PROOFING_STATE_KEY = 'proofing_state';
const PROOFING_LOGS_KEY = 'proofing_logs';
const MAX_LOGS = 50;

// [AI-GENERATED][ROBUSTNESS][V178] Keep log entries in memory until at least one
// persistence backend confirms the write. This allows a later append/flush to
// recover entries after a transient total storage failure.
const pendingLogEntries = [];

// [AI-GENERATED][ROBUSTNESS][V175] Serialize read-modify-write log appends.
// Concurrent completion/lifecycle events must not overwrite one another with
// snapshots that were read before the other append had finished persisting.
let logAppendChain = Promise.resolve();
// [AI-GENERATED][ROBUSTNESS][V252] Invalidates append requests that were queued
// before an explicit history cleanup, so failed/pending entries cannot reappear.
let logMutationGeneration = 0;

// [AI-GENERATED][ROBUSTNESS][V48] Monotonically increasing state generation
// invalidates queued persistence after a reset/clear operation.
let stateWriteGeneration = 0;

// [AI-GENERATED][ROBUSTNESS][V69] Coalesce high-frequency timer snapshots.
// The timer may call saveState() every second, but native Preferences does not
// need one write per tick. Keep only the newest pending snapshot so slow native
// storage cannot accumulate a stale write backlog.
let pendingNativeState = null;
// [AI-GENERATED][ROBUSTNESS][V73] Share the active flush promise so lifecycle
// callers can actually await an in-flight native write instead of returning
// early merely because another flush already owns the worker.
let nativeStateFlushPromise = null;
// [AI-GENERATED][ROBUSTNESS][V177] Remember a snapshot that could not be
// persisted anywhere, without immediately retrying it in a tight loop. A later
// explicit flush or a newer save can retry through the same single-flight worker.
let failedNativeStateGeneration = null;

function flushNativeStateWrites() {
    if (nativeStateFlushPromise) return nativeStateFlushPromise;

    nativeStateFlushPromise = (async () => {
        // [AI-GENERATED][ROBUSTNESS][V180] Report persistence outcome separately
        // from queue completion so lifecycle callers can distinguish a drained
        // worker from a snapshot that still needs a later retry.
        let allPendingWritesPersisted = true;
        while (pendingNativeState) {
            const pending = pendingNativeState;
            pendingNativeState = null;
            let result = false;

            try {
                result = await StorageService.setString(PROOFING_STATE_KEY, pending.serialized);
            } catch (error) {
                // [AI-GENERATED][ROBUSTNESS][V177] A rejected storage adapter is
                // handled like a failed write; preserve the newest snapshot for a
                // future explicit flush instead of silently discarding timer state.
                console.warn('[ProofingService] Sinkronisasi native state gagal:', error);
            }

            if (!result && pending.generation === stateWriteGeneration) {
                allPendingWritesPersisted = false;
                console.warn('[ProofingService] Persistensi state proofing gagal; snapshot dipertahankan untuk percobaan berikutnya.');
                failedNativeStateGeneration = pending.generation;
                // Never overwrite a newer snapshot that arrived during the write.
                if (!pendingNativeState || pendingNativeState.generation <= pending.generation) {
                    pendingNativeState = pending;
                }
                break;
            }

            if (result && failedNativeStateGeneration === pending.generation) {
                failedNativeStateGeneration = null;
            }
        }
        return allPendingWritesPersisted;
    })();

    // [AI-GENERATED][ROBUSTNESS][V161] Observe both settlement paths for the
    // detached cleanup branch; a rejected derived Promise must not leak as an
    // unhandled rejection if the flush worker ever fails before its own catch.
    const cleanup = () => {
        nativeStateFlushPromise = null;
        // [AI-GENERATED][ROBUSTNESS][V177] Auto-drain only a newer snapshot.
        // A failed current snapshot remains available for a later explicit flush,
        // avoiding an infinite retry loop when storage is persistently unavailable.
        if (pendingNativeState && pendingNativeState.generation !== failedNativeStateGeneration) {
            void flushNativeStateWrites();
        }
    };
    void nativeStateFlushPromise.then(cleanup, cleanup);

    return nativeStateFlushPromise;
}

function normalizeState(state = {}) {
    const totalSeconds = Number.isFinite(Number(state.totalSeconds))
        ? Math.round(Number(state.totalSeconds))
        : 0;
    const initialCandidate = Number(state.initialSeconds);
    // [AI-GENERATED][BUG FIX][V208] A positive sub-second persisted value must
    // not round down to zero; all normalized proofing durations use whole seconds.
    const initialSeconds = Number.isFinite(initialCandidate) && initialCandidate > 0
        ? Math.max(1, Math.round(initialCandidate))
        : Math.max(1, Math.abs(totalSeconds));

    const targetCandidate = Number(state.targetEndTime);
    const mode = typeof state.mode === 'string' && state.mode.trim() ? state.mode.trim() : null;
    return {
        totalSeconds,
        initialSeconds,
        isRunning: state.isRunning === true,
        targetEndTime: Number.isFinite(targetCandidate) && targetCandidate > 0 ? targetCandidate : null,
        mode,
        savedAt: Number.isFinite(Number(state.savedAt)) ? Number(state.savedAt) : Date.now()
    };
}

async function readLogs() {
    const logs = await StorageService.getJSON(PROOFING_LOGS_KEY, []);
    return Array.isArray(logs) ? logs : [];
}

function readLogsSync() {
    const logs = StorageService.getJSONSync(PROOFING_LOGS_KEY, []);
    return Array.isArray(logs) ? logs : [];
}

function appendLog(entry = {}) {
    // [AI-GENERATED][ROBUSTNESS][V252] Capture the request generation at call time.
    // A cleanup that begins before this queued operation reaches storage wins.
    const appendGeneration = logMutationGeneration;

    // [AI-GENERATED][ROBUSTNESS][V175] Serialize the complete read-modify-write
    // cycle so concurrent completion/lifecycle events cannot overwrite each other.
    // [AI-GENERATED][BUG FIX][V178] Keep queued entries until StorageService confirms
    // persistence. A false result is a total-backend failure, not a successful append.
    const appendOperation = logAppendChain
        .catch(() => undefined)
        .then(async () => {
            // [AI-GENERATED][BUG FIX][V252] Ignore an append that became stale while
            // waiting in the queue; the subsequent cleanup removes any older commit.
            if (appendGeneration !== logMutationGeneration) return readLogs();

            // [AI-GENERATED][BUG FIX][V241] Keep a stable entry ID across retries.
            // LocalStorage can commit even when the mirrored native write reports
            // failure; the retry must detect the existing copy instead of duplicating it.
            pendingLogEntries.push(createProofingLogEntry(entry));
            let logs = await readLogs();
            // [AI-GENERATED][BUG FIX][V252] A cleanup can be requested while readLogs()
            // is pending. Do not start another write for a request invalidated meanwhile.
            if (appendGeneration !== logMutationGeneration) return logs;
            logs = mergePendingProofingLogEntries(logs, pendingLogEntries, MAX_LOGS);

            const persisted = await StorageService.setJSON(PROOFING_LOGS_KEY, logs);
            if (persisted === false) {
                throw new Error('Tidak ada backend penyimpanan yang berhasil menyimpan log proofing.');
            }

            // Remove only the entries included in this successful write. Entries
            // added later remain queued for their own serialized operation.
            pendingLogEntries.splice(0, pendingLogEntries.length);
            return logs;
        });

    logAppendChain = appendOperation;
    return appendOperation;
}


// [AI-GENERATED][BUG FIX][V252] Explicitly clear persisted and in-memory proofing
// history as one serialized operation. Incrementing the generation immediately
// invalidates older queued append requests; an active append is allowed to settle
// before removal, ensuring its write cannot resurrect history after this resolves.
function clearLogs() {
    const clearGeneration = ++logMutationGeneration;
    const clearOperation = logAppendChain
        .catch((error) => {
            console.warn('[ProofingService] Mengabaikan kegagalan antrean log sebelum pembersihan:', error);
        })
        .then(async () => {
            if (clearGeneration !== logMutationGeneration) return false;

            pendingLogEntries.splice(0, pendingLogEntries.length);
            const removed = await StorageService.remove(PROOFING_LOGS_KEY);
            if (removed !== true) {
                console.warn('[ProofingService] Riwayat proofing belum terhapus dari seluruh backend penyimpanan.');
                return false;
            }
            return true;
        });

    logAppendChain = clearOperation;
    return clearOperation.catch((error) => {
        console.warn('[ProofingService] Gagal membersihkan riwayat proofing:', error);
        return false;
    });
}

function saveState(state = {}) {
    const normalized = normalizeState(state);
    const serialized = JSON.stringify(normalized);
    const generation = ++stateWriteGeneration;

    try {
        localStorage.setItem(PROOFING_STATE_KEY, serialized);
    } catch (error) {
        // [AI-GENERATED][ROBUSTNESS] Storage failure must not stop the timer engine.
        console.warn('[ProofingService] Gagal menyimpan state proofing:', error);
    }

    // [AI-GENERATED][ROBUSTNESS][V69] Native persistence is latest-state-wins.
    // LocalStorage remains immediately updated above, while slow native writes are
    // coalesced so a one-second timer tick cannot create an unbounded write queue.
    pendingNativeState = { generation, serialized };
    void flushNativeStateWrites();

    return normalized;
}

async function readState() {
    // [AI-GENERATED][ROBUSTNESS][V187] A native fallback read can remain in flight
    // while a newer timer tick/reset updates this service. Capture the state
    // generation so validation of an old snapshot cannot clear newer state.
    const readGeneration = stateWriteGeneration;

    // [AI-GENERATED][ROBUSTNESS][V68] Read through StorageService so native
    // Capacitor Preferences remains a real recovery source when LocalStorage
    // is unavailable, cleared, or unavailable after WebView recreation.
    const parsed = await StorageService.getJSON(PROOFING_STATE_KEY, null);

    // [AI-GENERATED][BUG FIX][V187] If a save/reset happened while the async
    // read was pending, prefer the current synchronous snapshot. Never interpret
    // an old/missing native result as authority over a newer in-memory mutation.
    if (readGeneration !== stateWriteGeneration) {
        try {
            const latest = StorageService.getJSONSync(PROOFING_STATE_KEY, null);
            return latest && typeof latest === 'object' ? normalizeState(latest) : null;
        } catch (error) {
            console.warn('[ProofingService] Snapshot terbaru tidak dapat dibaca setelah mutasi bersamaan:', error);
            return null;
        }
    }
    if (!parsed) return null;

    try {
        const total = Number(parsed?.totalSeconds);
        const initial = Number(parsed?.initialSeconds);
        let target = parsed?.targetEndTime == null ? null : Number(parsed.targetEndTime);
        const savedAt = Number(parsed?.savedAt);
        const mode = typeof parsed?.mode === 'string' && parsed.mode.trim() ? parsed.mode.trim() : null;

        // [AI-GENERATED][ROBUSTNESS][V48] Reject malformed/partial states instead
        // of silently manufacturing a new timer from incomplete persisted data.
        const validTotal = Number.isFinite(total);
        const validInitial = Number.isFinite(initial) && initial > 0;
        const validSavedAt = Number.isFinite(savedAt) && savedAt > 0;

        // [AI-GENERATED][BUG FIX][V186] Older/partially written running snapshots
        // may have a valid savedAt + totalSeconds but no usable absolute deadline.
        // Reconstruct the deadline from that same snapshot instead of rejecting it
        // and clearing the active timer. Since savedAt is refreshed with each save,
        // savedAt + totalSeconds preserves remaining time (including overtime)
        // without restarting the full duration from the moment the app reopens.
        if (parsed?.isRunning === true
            && (!Number.isFinite(target) || target <= 0)
            && validTotal
            && validSavedAt) {
            const reconstructedTarget = savedAt + (total * 1000);
            if (Number.isFinite(reconstructedTarget) && reconstructedTarget > 0) {
                target = reconstructedTarget;
                console.warn('[ProofingService] Deadline timer aktif direkonstruksi dari snapshot savedAt/totalSeconds.');
            }
        }

        const validTarget = target === null || (Number.isFinite(target) && target > 0);
        // [AI-GENERATED][BUG FIX][V49][V186] An active timer must resolve to a
        // usable absolute deadline. The snapshot-derived fallback above prevents
        // valid legacy state from being discarded, while truly incomplete state
        // is still rejected rather than restarting a stale duration.
        const validRunningTarget = parsed?.isRunning !== true || (Number.isFinite(target) && target > 0);
        // [AI-GENERATED][ROBUSTNESS][V67] A running timer must carry its mode as
        // part of the same persisted state. This prevents restoring a valid-looking
        // duration under an unrelated/stale UI mode.
        const validRunningMode = parsed?.isRunning !== true || mode !== null;
        if (typeof parsed !== 'object' || !validTotal || !validInitial || !validTarget || !validSavedAt || !validRunningTarget || !validRunningMode) {
            // [AI-GENERATED][ROBUSTNESS][V187] Validation must not clear a newer
            // timer snapshot if a mutation occurred during the asynchronous read.
            if (readGeneration !== stateWriteGeneration) {
                const latest = StorageService.getJSONSync(PROOFING_STATE_KEY, null);
                return latest && typeof latest === 'object' ? normalizeState(latest) : null;
            }
            console.warn('[ProofingService] State proofing tidak valid; state direset.');
            clearState();
            return null;
        }

        const normalized = normalizeState({ ...parsed, mode, targetEndTime: target });
        // [AI-GENERATED][ROBUSTNESS][V49] Keep this invariant explicit after normalization.
        if (normalized.isRunning && normalized.targetEndTime === null) {
            if (readGeneration !== stateWriteGeneration) {
                const latest = StorageService.getJSONSync(PROOFING_STATE_KEY, null);
                return latest && typeof latest === 'object' ? normalizeState(latest) : null;
            }
            console.warn('[ProofingService] State timer aktif tanpa targetEndTime; state direset.');
            clearState();
            return null;
        }
        return normalized;
    } catch (error) {
        // [AI-GENERATED][ROBUSTNESS][V187] A stale malformed native response is
        // not allowed to erase a newer successful save.
        if (readGeneration !== stateWriteGeneration) {
            const latest = StorageService.getJSONSync(PROOFING_STATE_KEY, null);
            return latest && typeof latest === 'object' ? normalizeState(latest) : null;
        }
        console.warn('[ProofingService] Invalid proofing state:', error);
        clearState();
        return null;
    }
}

function clearState() {
    // [AI-GENERATED][ROBUSTNESS][V69] Invalidate and discard any snapshot that
    // has not started native persistence. If a native write is already in flight,
    // StorageService.remove() is queued after it, making the clear operation the
    // final native state for this key.
    stateWriteGeneration += 1;
    pendingNativeState = null;
    failedNativeStateGeneration = null;

    // [AI-GENERATED][ROBUSTNESS][V225] Delegate both local and native removal
    // to StorageService exactly once. Its boolean result now distinguishes a
    // fully removed key from a partial failure that might otherwise resurrect
    // a stale timer on the next native read/restore.
    return StorageService.remove(PROOFING_STATE_KEY)
        .then((removedEverywhere) => {
            if (!removedEverywhere) {
                console.warn('[ProofingService] State proofing belum terhapus dari seluruh backend penyimpanan.');
            }
            return removedEverywhere;
        })
        .catch((error) => {
            console.warn('[ProofingService] Gagal menghapus state proofing:', error);
            return false;
        });

    // [AI-GENERATED][REFACTOR][V63] Persistence service stays domain-pure.
    // Notification cancellation is owned by the application proofing reset/lifecycle
    // boundary, avoiding duplicate cancellation and a hidden window-service dependency.
}

// [AI-GENERATED][ROBUSTNESS][V72] Explicit persistence barrier for lifecycle
// transitions. LocalStorage is already synchronous, while native Preferences
// requires an awaited flush before the WebView may be suspended.
async function flushPersistence() {
    // [AI-GENERATED][ROBUSTNESS][V180] A completed worker is not necessarily a
    // successful write. Carry the actual state-persistence result to the caller.
    let statePersisted = true;

    // [AI-GENERATED][ROBUSTNESS][V81] Flush both this service's coalesced
    // snapshot worker and any StorageService operation already queued for the
    // canonical proofing-state key. This makes the lifecycle barrier cover SET
    // and REMOVE operations, not only snapshots owned by this module.
    statePersisted = await flushNativeStateWrites();
    if (typeof StorageService.flush === 'function') {
        try {
            const queuedWritesPersisted = await StorageService.flush(PROOFING_STATE_KEY);
            if (queuedWritesPersisted === false) statePersisted = false;
        } catch (error) {
            statePersisted = false;
            console.warn('[ProofingService] FLUSH state proofing gagal:', error);
        }
    }

    // [AI-GENERATED][ROBUSTNESS][V176] Lifecycle suspension must also wait for
    // any proofing-log append already queued by completion/lifecycle handlers.
    // An append failure is best-effort and must not prevent timer-state flushing
    // or turn a visibility/back-button cleanup into an unhandled rejection.
    await logAppendChain.catch((error) => {
        console.warn('[ProofingService] Gagal menyelesaikan antrean log sebelum suspend:', error);
    });

    // [AI-GENERATED][ROBUSTNESS][V179] Make one explicit recovery attempt for
    // log entries retained after a prior total-backend failure. This retry is
    // lifecycle-triggered (not a timer/loop), so persistent storage failures do
    // not create a tight retry cycle. The same serialized chain preserves order
    // relative to appends arriving while the lifecycle flush is running.
    let logsPersisted = pendingLogEntries.length === 0;
    if (pendingLogEntries.length > 0) {
        const retryPendingLogs = logAppendChain
            .catch(() => undefined)
            .then(async () => {
                if (pendingLogEntries.length === 0) return true;

                const pendingCount = pendingLogEntries.length;
                let logs = await readLogs();
                // [AI-GENERATED][BUG FIX][V241] Lifecycle retry uses the same
                // idempotent merge as appendLog() to avoid duplicate committed entries.
                logs = mergePendingProofingLogEntries(
                    logs,
                    pendingLogEntries.slice(0, pendingCount),
                    MAX_LOGS
                );

                const persisted = await StorageService.setJSON(PROOFING_LOGS_KEY, logs);
                if (persisted === false) {
                    throw new Error('Penyimpanan log proofing masih tidak tersedia setelah retry lifecycle.');
                }

                pendingLogEntries.splice(0, pendingCount);
                return true;
            });
        logAppendChain = retryPendingLogs;
        try {
            logsPersisted = await retryPendingLogs;
        } catch (error) {
            logsPersisted = false;
            console.warn('[ProofingService] Retry log saat flush lifecycle gagal; entri tetap ditahan di memori:', error);
        }
    }

    // [AI-GENERATED][ROBUSTNESS][V180] False means at least one item remains
    // unpersisted; the caller can log/measure it instead of treating queue
    // completion as durable storage success. Pending snapshots/logs remain queued.
    return statePersisted && logsPersisted;
}

export const ProofingService = Object.freeze({
    readLogs,
    readLogsSync,
    appendLog,
    clearLogs,
    saveState,
    readState,
    clearState,
    flushPersistence,
    keys: Object.freeze({ state: PROOFING_STATE_KEY, logs: PROOFING_LOGS_KEY })
});

// [AI-GENERATED][ES6 MODULE][V270] Internal consumers import ProofingService directly.
// Do not publish a mutable window alias; no production consumer requires it.
