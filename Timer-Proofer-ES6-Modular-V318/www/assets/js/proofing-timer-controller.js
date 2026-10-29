// [AI-GENERATED][REFACTOR] Canonical runtime controller for the proofing countdown lifecycle.
// Keeps timer scheduling/drift correction independent from DOM rendering and application UI.

export function createProofingTimerController() {
    let intervalId = null;
    let targetEndTime = null;
    let controllerGeneration = 0;

    function stopIntervalOnly() {
        // [AI-GENERATED][BUG FIX][V240] Stop scheduling without discarding the
        // absolute deadline. Overtime-toast dismissal freezes the display but
        // still needs the original deadline for coherent snapshots/diagnostics.
        controllerGeneration += 1;
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function stop() {
        // [AI-GENERATED][BUG FIX][V240] A full stop resets both the scheduler
        // and its deadline; stopIntervalOnly() intentionally preserves the latter.
        stopIntervalOnly();
        targetEndTime = null;
    }

    function isRunning() {
        // [AI-GENERATED][BUG FIX][V245] Timer APIs use null as the no-handle sentinel;
        // zero is still a valid handle and must not be treated as stopped.
        return intervalId !== null;
    }

    function getRemainingSeconds(now = Date.now()) {
        if (!Number.isFinite(targetEndTime)) return null;
        return Math.round((targetEndTime - now) / 1000);
    }

    function start(totalSeconds, { onTick, onOvertime, allowOvertime = false, targetEndTime: restoredTargetEndTime = null } = {}) {
        // [AI-GENERATED][BUG FIX][V246] Number(Symbol) and user-defined coercion
        // hooks can throw. Treat those values as invalid input and leave any
        // currently running timer untouched instead of escaping through UI startup.
        let safeSeconds;
        try {
            safeSeconds = Number(totalSeconds);
        } catch {
            return null;
        }
        if (!Number.isFinite(safeSeconds) || (!allowOvertime && safeSeconds <= 0)) return null;

        // [AI-GENERATED][BUG FIX][V206] A restored absolute deadline is authoritative.
        // Do not silently accept an already-expired deadline unless the caller explicitly
        // opted into overtime; rejecting it must not stop a valid timer already running.
        // [AI-GENERATED][ROBUSTNESS][V246] A malformed restored target is treated
        // like an absent target, matching the existing NaN/invalid-target fallback.
        let candidateTarget = Number.NaN;
        try {
            candidateTarget = Number(restoredTargetEndTime);
        } catch {
            // Use a fresh deadline derived from safeSeconds below.
        }
        const hasRestoredTarget = Number.isFinite(candidateTarget) && candidateTarget > 0;
        const now = Date.now();
        if (hasRestoredTarget && candidateTarget <= now && !allowOvertime) return null;

        // [AI-GENERATED][BUG FIX][V245] Check the sentinel explicitly so a valid
        // zero-like interval handle is cancelled before a replacement is started.
        if (intervalId !== null) stopIntervalOnly();
        else controllerGeneration += 1;
        const generation = controllerGeneration;

        targetEndTime = hasRestoredTarget
            ? candidateTarget
            : now + (safeSeconds * 1000);

        const tick = () => {
            // [AI-GENERATED][ROBUSTNESS][V47] Ignore a stale callback that may
            // already be queued when stop/start happens at the same time.
            if (generation !== controllerGeneration) return;
            const remainingSeconds = Math.round((targetEndTime - Date.now()) / 1000);

            try {
                if (remainingSeconds >= 0) {
                    if (typeof onTick === 'function') onTick(remainingSeconds);
                } else if (typeof onOvertime === 'function') {
                    onOvertime(remainingSeconds);
                }
            } catch (error) {
                // [AI-GENERATED][ROBUSTNESS][V207] A rendering/application callback
                // must not leave this timer generation running after its caller sees
                // start()/tick fail. Do not stop a replacement timer started by the
                // callback: that timer owns a newer controllerGeneration.
                if (generation === controllerGeneration) stop();
                throw error;
            }
        };

        // [AI-GENERATED][BUG FIX][V167] Register the interval before the first
        // synchronous tick. A callback can stop/restart the controller immediately;
        // assigning the interval afterward would overwrite that stop and leak a
        // stale interval whose generation guard only makes it silently do nothing.
        intervalId = setInterval(tick, 1000);

        // [AI-GENERATED][ROBUSTNESS] Render the current state immediately instead
        // of waiting one second, while the absolute target remains the source of truth.
        tick();

        return intervalId;
    }

    function getTargetEndTime() {
        return targetEndTime;
    }

    return Object.freeze({
        start,
        stop,
        stopIntervalOnly,
        isRunning,
        getTargetEndTime,
        getRemainingSeconds
    });
}
