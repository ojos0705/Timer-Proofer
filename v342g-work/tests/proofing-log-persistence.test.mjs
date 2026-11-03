/** [AI-GENERATED][QA][V241] Regression tests for idempotent proofing-log persistence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    createProofingLogEntry,
    mergePendingProofingLogEntries
} from '../assets/js/proofing-log-persistence.js';

test('pending log retry does not duplicate an entry already committed to LocalStorage', () => {
    const pending = createProofingLogEntry({ title: 'Proofing selesai', desc: 'Batch A' }, 1000);
    const firstWrite = mergePendingProofingLogEntries([], [pending], 50);

    // This is the partial-write situation: the local copy exists, but the caller
    // was told the full mirrored write failed and therefore keeps `pending` queued.
    assert.equal(firstWrite.length, 1);
    const retryWrite = mergePendingProofingLogEntries(firstWrite, [pending], 50);

    assert.equal(retryWrite.length, 1);
    assert.deepEqual(retryWrite[0], pending);
});

test('distinct identical-looking events remain distinct while a repeated retry is idempotent', () => {
    const first = createProofingLogEntry({ title: 'Timer selesai', timestamp: 5000 }, 5000);
    const second = createProofingLogEntry({ title: 'Timer selesai', timestamp: 5000 }, 5000);

    assert.notEqual(first.__tpPersistenceId, second.__tpPersistenceId);
    const committed = mergePendingProofingLogEntries([], [first, second], 50);
    const retry = mergePendingProofingLogEntries(committed, [first, second], 50);

    assert.equal(committed.length, 2);
    assert.equal(retry.length, 2);
});

test('log deduplication preserves legacy entries and enforces the configured retention limit', () => {
    const legacy = Array.from({ length: 3 }, (_, i) => ({ title: `legacy-${i}` }));
    const a = createProofingLogEntry({ title: 'A' });
    const b = createProofingLogEntry({ title: 'B' });
    const merged = mergePendingProofingLogEntries(legacy, [a, b], 3);

    assert.deepEqual(merged.map((entry) => entry.title), ['legacy-2', 'A', 'B']);
    assert.equal(merged.length, 3);
    assert.deepEqual(mergePendingProofingLogEntries(legacy, [a, b], 0), []);
});


test('append and lifecycle retry share the idempotent merge helper', () => {
    const source = fs.readFileSync(new URL('../assets/js/proofing-service.js', import.meta.url), 'utf8');
    assert.match(source, /pendingLogEntries\.push\(createProofingLogEntry\(entry\)\)/);
    assert.equal((source.match(/mergePendingProofingLogEntries\(/g) || []).length, 2,
        'append and lifecycle retry must both use the idempotent merge helper');
});
