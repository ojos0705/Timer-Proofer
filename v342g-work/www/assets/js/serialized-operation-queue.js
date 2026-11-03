/**
 * [AI-GENERATED][ROBUSTNESS][V190] Serialize async mutations while allowing
 * subsequent operations to proceed after a previous operation rejects.
 * The returned promise preserves each operation's own success/failure result.
 */
export function createSerializedOperationQueue() {
    let tail = Promise.resolve();

    return function enqueue(operation) {
        if (typeof operation !== 'function') {
            return Promise.reject(new TypeError('Queue operation must be a function.'));
        }

        const next = tail.catch(() => undefined).then(operation);
        tail = next;
        return next;
    };
}
