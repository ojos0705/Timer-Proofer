/** [AI-GENERATED][QA][V212] Regressions for late native storage reads. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createKeyMutationTracker, reconcileNativeRead } from '../assets/js/storage-read-consistency.js';

function createLocalStore(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    get(key) { return values.has(key) ? values.get(key) : null; },
    set(key, value) { values.set(key, String(value)); },
    remove(key) { values.delete(key); },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function reconcile({ key, nativeValue, defaultValue = null, guard, store }) {
  return reconcileNativeRead({
    key,
    nativeValue,
    defaultValue,
    wasInvalidated: guard.wasMutated(),
    readLocalValue: (name) => store.get(name),
    writeLocalValue: (name, value) => store.set(name, value),
  });
}

test('a late native snapshot cannot overwrite a newer StorageService write', async () => {
  const tracker = createKeyMutationTracker();
  const store = createLocalStore();
  const guard = tracker.beginRead('timer-state');
  const pendingNativeRead = deferred();
  const resolvedRead = pendingNativeRead.promise.then((nativeValue) =>
    reconcile({ key: 'timer-state', nativeValue, guard, store }),
  );

  tracker.noteMutation('timer-state');
  store.set('timer-state', '{"deadline":200}');
  pendingNativeRead.resolve('{"deadline":100}');

  assert.equal(await resolvedRead, '{"deadline":200}');
  assert.equal(store.get('timer-state'), '{"deadline":200}');
  guard.finish();
});

test('a late native snapshot does not resurrect a key removed while the read was pending', async () => {
  const tracker = createKeyMutationTracker();
  const store = createLocalStore();
  const guard = tracker.beginRead('active-timer');
  const pendingNativeRead = deferred();
  const resolvedRead = pendingNativeRead.promise.then((nativeValue) =>
    reconcile({ key: 'active-timer', nativeValue, defaultValue: null, guard, store }),
  );

  tracker.noteMutation('active-timer');
  store.remove('active-timer');
  pendingNativeRead.resolve('stale-timer');

  assert.equal(await resolvedRead, null);
  assert.equal(store.get('active-timer'), null);
  guard.finish();
});

test('native-only legacy values still hydrate when no newer mutation occurs', () => {
  const tracker = createKeyMutationTracker();
  const store = createLocalStore();
  const guard = tracker.beginRead('legacy-profile');

  assert.equal(reconcile({ key: 'legacy-profile', nativeValue: '{"name":"Joko"}', guard, store }), '{"name":"Joko"}');
  assert.equal(store.get('legacy-profile'), '{"name":"Joko"}');
  guard.finish();
});

test('direct synchronous local writes are preferred even when they bypass the mutation tracker', () => {
  const tracker = createKeyMutationTracker();
  const store = createLocalStore();
  const guard = tracker.beginRead('language');

  store.set('language', 'id');
  assert.equal(reconcile({ key: 'language', nativeValue: 'en', guard, store }), 'id');
  assert.equal(store.get('language'), 'id');
  guard.finish();
});

test('concurrent reads share mutation invalidation and can finish independently', () => {
  const tracker = createKeyMutationTracker();
  const store = createLocalStore();
  const first = tracker.beginRead('settings');
  const second = tracker.beginRead('settings');

  tracker.noteMutation('settings');
  store.set('settings', 'new');
  assert.equal(first.wasMutated(), true);
  assert.equal(second.wasMutated(), true);
  first.finish();
  assert.equal(reconcile({ key: 'settings', nativeValue: 'old', guard: second, store }), 'new');
  second.finish();
});
