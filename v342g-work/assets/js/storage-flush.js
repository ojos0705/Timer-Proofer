/**
 * [AI-GENERATED][ROBUSTNESS][V229] Await a stable per-key persistence queue.
 * A lifecycle flush must not report success from an old queue snapshot when a
 * newer write or account-reset barrier appears while an earlier write settles.
 */
export async function flushPersistenceQueueUntilStable({
    key,
    getPendingWrite,
    getResetBarrier,
    hasFailed,
} = {}) {
    if (!key) return true;
    if (typeof getPendingWrite !== 'function'
        || typeof getResetBarrier !== 'function'
        || typeof hasFailed !== 'function') {
        return false;
    }

    while (true) {
        const barrierAtStart = getResetBarrier();
        try {
            await barrierAtStart;
        } catch {
            // The owner may expose a rejected barrier so it can observe the error;
            // stability checks below still prevent us from crossing a changed barrier.
        }

        if (getResetBarrier() !== barrierAtStart) continue;

        const pendingAtStart = getPendingWrite(key);
        if (pendingAtStart) {
            try {
                await pendingAtStart;
            } catch {
                return false;
            }
        }

        // Awaiting either promise yields control. Re-check both references to
        // cover writes queued during the wait and resets that started meanwhile.
        if (getResetBarrier() !== barrierAtStart) continue;
        if (getPendingWrite(key) !== pendingAtStart) continue;

        return !hasFailed(key);
    }
}
