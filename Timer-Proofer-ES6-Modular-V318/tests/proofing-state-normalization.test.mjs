/** [AI-GENERATED][QA][V208] Regression test for persisted timer duration normalization. */
import test from 'node:test';
import assert from 'node:assert/strict';

const values = new Map();
globalThis.window = globalThis;
globalThis.Capacitor = { isNativePlatform: () => false };
globalThis.localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); }
};

const { ProofingService } = await import('../assets/js/proofing-service.js');

test('positive sub-second initialSeconds never normalizes to zero', async () => {
    localStorage.setItem('proofing_state', JSON.stringify({
        totalSeconds: 0.4,
        initialSeconds: 0.4,
        isRunning: false,
        targetEndTime: null,
        mode: null,
        savedAt: Date.now()
    }));

    const state = await ProofingService.readState();
    assert.ok(state);
    assert.equal(state.initialSeconds, 1);
    assert.equal(state.totalSeconds, 0);
});

test('clearState reports confirmed browser removal and clears the persisted timer key', async () => {
    localStorage.setItem('proofing_state', JSON.stringify({
        totalSeconds: 60,
        initialSeconds: 60,
        isRunning: false,
        targetEndTime: null,
        mode: null,
        savedAt: Date.now()
    }));

    assert.equal(await ProofingService.clearState(), true);
    assert.equal(localStorage.getItem('proofing_state'), null);
});
