/**
 * [AI-GENERATED][ROBUSTNESS][V226] Guard synchronous timer startup failures.
 * Timer controllers may throw during their immediate first tick. Return an
 * explicit result so callers can roll back the UI/runtime state instead of
 * leaving a false `isRunning` flag behind.
 */
export function startTimerWithRecovery(startTimer, recover = null) {
    if (typeof startTimer !== 'function') {
        throw new TypeError('startTimer harus berupa fungsi.');
    }

    try {
        return Object.freeze({
            ok: true,
            handle: startTimer(),
            error: null,
            recoveryError: null,
        });
    } catch (error) {
        let recoveryError = null;
        if (typeof recover === 'function') {
            try {
                recover(error);
            } catch (cleanupError) {
                recoveryError = cleanupError;
            }
        }

        return Object.freeze({
            ok: false,
            handle: null,
            error,
            recoveryError,
        });
    }
}
