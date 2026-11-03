/** [AI-GENERATED][QA][V227] Profile storage cleanup result semantics. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { removeStorageKeys } from '../assets/js/profile-cleanup.js';

test('profile cleanup confirms success only when each key removal returns true', async () => {
    const attempted = [];
    const result = await removeStorageKeys(['profile_name', 'profile_bakery'], async (key) => {
        attempted.push(key);
        return true;
    });

    assert.deepEqual(attempted, ['profile_name', 'profile_bakery']);
    assert.deepEqual(result, { success: true, failedKeys: [], attempted: 2 });
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.failedKeys), true);
});

test('profile cleanup reports a false result and continues through remaining keys', async () => {
    const attempted = [];
    const result = await removeStorageKeys(['profile_name', 'proofing_state', 'tp_notifs'], async (key) => {
        attempted.push(key);
        return key !== 'proofing_state';
    });

    assert.deepEqual(attempted, ['profile_name', 'proofing_state', 'tp_notifs']);
    assert.equal(result.success, false);
    assert.deepEqual(result.failedKeys, ['proofing_state']);
    assert.equal(result.attempted, 3);
});

test('profile cleanup captures rejected removals without aborting later keys', async () => {
    const attempted = [];
    const result = await removeStorageKeys(['profile_name', 'profile_email', 'proofing_logs'], async (key) => {
        attempted.push(key);
        if (key === 'profile_email') throw new Error('Preferences unavailable');
        return true;
    });

    assert.deepEqual(attempted, ['profile_name', 'profile_email', 'proofing_logs']);
    assert.equal(result.success, false);
    assert.deepEqual(result.failedKeys, ['profile_email']);
});

test('profile cleanup rejects non-true values as unconfirmed removal', async () => {
    const result = await removeStorageKeys(['activeMode', 'timerDuration'], async () => undefined);
    assert.equal(result.success, false);
    assert.deepEqual(result.failedKeys, ['activeMode', 'timerDuration']);
});

test('invalid key entries are reported without calling the storage adapter', async () => {
    let adapterCalls = 0;
    const result = await removeStorageKeys(['profile_name', '', null], async () => {
        adapterCalls += 1;
        return true;
    });

    assert.equal(adapterCalls, 1);
    assert.equal(result.success, false);
    assert.deepEqual(result.failedKeys, ['', null]);
    assert.equal(result.attempted, 3);
});

test('profile cleanup validates its inputs before starting storage work', async () => {
    await assert.rejects(removeStorageKeys('profile_name', async () => true), /keys harus berupa array/);
    await assert.rejects(removeStorageKeys(['profile_name'], null), /removeKey harus berupa fungsi/);
});

// [AI-GENERATED][QA][V252] Profile-history cleanup must invalidate ProofingService's pending retry queue.
test('profile cleanup routes proofing_logs through the canonical clearLogs operation', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
    assert.match(source, /key === 'proofing_logs'[\s\S]*?ProofingService\.clearLogs\(\)/);
    assert.match(source, /window\.proofingHistory\s*=\s*\[\]/);
});
