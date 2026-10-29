/** [AI-GENERATED][QA][V190] Regression coverage for serialized native mutations. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSerializedOperationQueue } from '../assets/js/serialized-operation-queue.js';

test('runs async operations in enqueue order without overlapping them', async () => {
    const enqueue = createSerializedOperationQueue();
    const events = [];
    let releaseFirst;
    let markFirstStarted;
    const firstStarted = new Promise((resolve) => { markFirstStarted = resolve; });
    const firstGate = new Promise((resolve) => { releaseFirst = resolve; });

    const first = enqueue(async () => {
        events.push('first:start');
        markFirstStarted();
        await firstGate;
        events.push('first:end');
        return 'first-result';
    });
    const second = enqueue(async () => {
        events.push('second:start');
        events.push('second:end');
        return 'second-result';
    });

    await firstStarted;
    assert.deepEqual(events, ['first:start']);
    releaseFirst();
    assert.deepEqual(await Promise.all([first, second]), ['first-result', 'second-result']);
    assert.deepEqual(events, ['first:start', 'first:end', 'second:start', 'second:end']);
});

test('a rejected operation does not block later queued operations', async () => {
    const enqueue = createSerializedOperationQueue();
    const events = [];
    const rejected = enqueue(async () => {
        events.push('rejected');
        throw new Error('simulated native bridge failure');
    });
    const recovered = enqueue(async () => {
        events.push('recovered');
        return 42;
    });

    await assert.rejects(rejected, /simulated native bridge failure/);
    assert.equal(await recovered, 42);
    assert.deepEqual(events, ['rejected', 'recovered']);
});

test('rejects non-function operations without breaking the queue', async () => {
    const enqueue = createSerializedOperationQueue();
    await assert.rejects(enqueue(null), /must be a function/);
    assert.equal(await enqueue(() => 'still-usable'), 'still-usable');
});
