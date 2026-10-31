/** [AI-GENERATED][QA][V226] Startup exception handling regressions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startTimerWithRecovery } from '../assets/js/core/timer-start-guard.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appCoreSource = fs.readFileSync(path.join(root, 'assets/js/app-core.js'), 'utf8');
const serviceWorkerSource = fs.readFileSync(path.join(root, 'www/sw.js'), 'utf8');

test('successful timer startup preserves the exact returned handle and skips recovery', () => {
    const handle = { interval: 5 };
    let recoverCalled = false;
    const result = startTimerWithRecovery(() => handle, () => { recoverCalled = true; });

    assert.equal(result.ok, true);
    assert.equal(result.handle, handle);
    assert.equal(result.error, null);
    assert.equal(result.recoveryError, null);
    assert.equal(recoverCalled, false);
});

test('zero-like timer handles are preserved rather than treated as startup exceptions', () => {
    const result = startTimerWithRecovery(() => 0);
    assert.equal(result.ok, true);
    assert.equal(result.handle, 0);
});

test('startup exception invokes recovery exactly once and retains the original error', () => {
    const originalError = new Error('initial tick failed');
    const recovered = [];
    const result = startTimerWithRecovery(() => { throw originalError; }, (error) => recovered.push(error));

    assert.equal(result.ok, false);
    assert.equal(result.handle, null);
    assert.equal(result.error, originalError);
    assert.equal(result.recoveryError, null);
    assert.deepEqual(recovered, [originalError]);
});

test('recovery failure is reported separately without masking the startup failure', () => {
    const originalError = new Error('timer startup failed');
    const cleanupError = new Error('cleanup failed');
    const result = startTimerWithRecovery(
        () => { throw originalError; },
        () => { throw cleanupError; },
    );

    assert.equal(result.ok, false);
    assert.equal(result.error, originalError);
    assert.equal(result.recoveryError, cleanupError);
});

test('rejects a non-function starter as a programming error', () => {
    assert.throws(() => startTimerWithRecovery(null), /startTimer harus berupa fungsi/);
});

test('app-core rolls back running UI state after a synchronous first-tick exception', () => {
    assert.match(appCoreSource, /startTimerWithRecovery\(/);
    assert.match(appCoreSource, /timerStartResult\.ok/);
    assert.match(appCoreSource, /isTimerRunning\s*=\s*false/);
    assert.match(appCoreSource, /persistProofingState\(\)/);
    assert.match(appCoreSource, /ProofingNotificationService\.cancel\(\)/);
    assert.match(appCoreSource, /timerInterval\s*=\s*null/);
});

test('timer startup guard is included in Service Worker precache for first offline boot', () => {
    assert.match(serviceWorkerSource, /\.\/assets\/js\/core\/timer-start-guard\.js/);
    assert.match(serviceWorkerSource, /Timer-Proofing-v1\.1\.231/);
});

