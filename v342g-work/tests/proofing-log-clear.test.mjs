/** [AI-GENERATED][QA][V252] Explicit history cleanup must invalidate queued and failed log writes. */
import test from 'node:test';
import assert from 'node:assert/strict';

const values = new Map();
let blockedSetKey = null;
globalThis.window = globalThis;
globalThis.Capacitor = { isNativePlatform: () => false };
globalThis.localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
        if (key === blockedSetKey) throw new Error('simulated storage write failure');
        values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); }
};

const { ProofingService } = await import('../assets/js/proofing-service.js');

// [AI-GENERATED][QA][V252] A queued append that predates cleanup must not commit afterward.
test('clearLogs invalidates an append still waiting in the serialized queue', async () => {
    localStorage.clear();
    const append = ProofingService.appendLog({ title: 'Log lama yang harus dibatalkan' });
    const clear = ProofingService.clearLogs();

    await append;
    assert.equal(await clear, true);
    assert.equal(localStorage.getItem('proofing_logs'), null);
    assert.deepEqual(ProofingService.readLogsSync(), []);
});

// [AI-GENERATED][QA][V252] Pending entries from a failed write must be discarded by explicit cleanup.
test('clearLogs discards an in-memory retry after a persistence failure', async () => {
    localStorage.clear();
    blockedSetKey = 'proofing_logs';
    await assert.rejects(
        ProofingService.appendLog({ title: 'Log gagal yang tidak boleh muncul lagi' }),
        /Tidak ada backend penyimpanan yang berhasil menyimpan log proofing/
    );

    blockedSetKey = null;
    assert.equal(await ProofingService.clearLogs(), true);
    assert.equal(await ProofingService.flushPersistence(), true);
    assert.equal(localStorage.getItem('proofing_logs'), null);
    assert.deepEqual(ProofingService.readLogsSync(), []);
});

// [AI-GENERATED][QA][V252] Calls made after cleanup remain valid new history operations.
test('append requested after clearLogs completes is persisted normally', async () => {
    localStorage.clear();
    assert.equal(await ProofingService.clearLogs(), true);
    const logs = await ProofingService.appendLog({ title: 'Log baru' });

    assert.equal(logs.length, 1);
    assert.equal(logs[0].title, 'Log baru');
    assert.equal(ProofingService.readLogsSync().length, 1);
});
