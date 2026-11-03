/**
 * [AI-GENERATED][ROBUSTNESS][V212] Read-consistency guards for asynchronous
 * native persistence. Prevents a late Preferences snapshot from replacing a
 * newer local value or resurrecting a key removed while the read was pending.
 */
export function createKeyMutationTracker() {
  const activeReads = new Map();

  function beginRead(key) {
    let state = activeReads.get(key);
    if (!state) {
      state = { readers: 0, mutationVersion: 0 };
      activeReads.set(key, state);
    }
    state.readers += 1;
    const startingVersion = state.mutationVersion;
    let finished = false;

    return Object.freeze({
      wasMutated() {
        return state.mutationVersion !== startingVersion;
      },
      finish() {
        if (finished) return;
        finished = true;
        state.readers = Math.max(0, state.readers - 1);
        if (state.readers === 0 && activeReads.get(key) === state) {
          activeReads.delete(key);
        }
      },
    });
  }

  function noteMutation(key) {
    const state = activeReads.get(key);
    if (state) state.mutationVersion += 1;
  }

  return Object.freeze({ beginRead, noteMutation });
}

/**
 * Resolve an asynchronous native read without allowing an old snapshot to win.
 * Callbacks are injected so the behavior can be tested independently of native
 * plugin discovery. A `null`/`undefined` local value means the key is absent.
 */
export function reconcileNativeRead({
  key,
  nativeValue,
  defaultValue = null,
  wasInvalidated = false,
  readLocalValue,
  writeLocalValue,
}) {
  const currentLocalValue = readLocalValue(key);
  if (currentLocalValue !== null && currentLocalValue !== undefined) {
    return currentLocalValue;
  }

  // A mutation occurred after this native read started (or an account-wide
  // reset crossed it). Absence now is meaningful: do not resurrect old data.
  if (wasInvalidated) return defaultValue;

  if (nativeValue !== null && nativeValue !== undefined && nativeValue !== '') {
    writeLocalValue(key, nativeValue);
    return nativeValue;
  }

  return defaultValue;
}
