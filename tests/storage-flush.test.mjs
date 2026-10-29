/** [AI-GENERATED][QA][V229] Lifecycle persistence queue-race regressions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { flushPersistenceQueueUntilStable } from '../assets/js/storage-flush.js';

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((done, fail) => {
        resolve = done;
        reject = fail;
    });
    return { promise, resolve, reject };
}

test('flush waits for a newer per-key write appended while an older write settles', async () => {
    const firstWrite = deferred();
    const secondWrite = deferred();
    const firstInspection = deferred();
    let pendingWrite = firstWrite.promise;
    const stableBarrier = Promise.resolve();
    let didInspect = false;
    let completed = false;

    const flushPromise = flushPersistenceQueueUntilStable({
        key: 'proofing_state',
        getPendingWrite: () => {
            if (!didInspect) {
                didInspect = true;
                firstInspection.resolve();
            }
            return pendingWrite;
        },
        getResetBarrier: () => stableBarrier,
        hasFailed: () => false,
    }).then((result) => {
        completed = true;
        return result;
    });

    await firstInspection.promise;
    pendingWrite = secondWrite.promise;
    firstWrite.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(completed, false, 'flush must not finish while the newer write is still pending');
    pendingWrite = null;
    secondWrite.resolve();
    assert.equal(await flushPromise, true);
});

test('flush restarts when an account-reset barrier changes during an awaited write', async () => {
    const firstWrite = deferred();
    const resetBarrier = deferred();
    const firstInspection = deferred();
    let barrier = Promise.resolve();
    let pendingWrite = firstWrite.promise;
    let didInspect = false;
    let completed = false;

    const flushPromise = flushPersistenceQueueUntilStable({
        key: 'proofing_state',
        getPendingWrite: () => {
            if (!didInspect) {
                didInspect = true;
                firstInspection.resolve();
            }
            return pendingWrite;
        },
        getResetBarrier: () => barrier,
        hasFailed: () => false,
    }).then((result) => {
        completed = true;
        return result;
    });

    await firstInspection.promise;
    barrier = resetBarrier.promise;
    firstWrite.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(completed, false, 'flush must wait for the new reset barrier');
    pendingWrite = null;
    resetBarrier.resolve();
    assert.equal(await flushPromise, true);
});

test('flush reports failed in-flight writes instead of masking them', async () => {
    const failedWrite = Promise.reject(new Error('simulated native write failure'));
    const stableBarrier = Promise.resolve();
    const result = await flushPersistenceQueueUntilStable({
        key: 'proofing_state',
        getPendingWrite: () => failedWrite,
        getResetBarrier: () => stableBarrier,
        hasFailed: () => false,
    });
    assert.equal(result, false);
});

test('flush returns false for an invalid dependency contract', async () => {
    assert.equal(await flushPersistenceQueueUntilStable({ key: 'proofing_state' }), false);
    assert.equal(await flushPersistenceQueueUntilStable({ key: '' }), true);
});
