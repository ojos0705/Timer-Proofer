/**
 * [AI-GENERATED][QA][V207] Regression tests for the canonical proofing timer controller.
 * Run with: npm test
 * These are Node-level tests; browser/native UI behavior still needs separate E2E coverage.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createProofingTimerController } from '../assets/js/proofing-timer-controller.js';

test('rejects invalid duration without creating a running timer', () => {
    const controller = createProofingTimerController();

    assert.equal(controller.start(Number.NaN), null);
    assert.equal(controller.start(0), null);
    assert.equal(controller.start(-1), null);
    assert.equal(controller.isRunning(), false);
    assert.equal(controller.getTargetEndTime(), null);
});

test('uses a valid restored deadline as the canonical target', () => {
    const controller = createProofingTimerController();
    const target = Date.now() + 30_000;

    controller.start(5, { targetEndTime: target });
    assert.equal(controller.getTargetEndTime(), target);
    assert.equal(controller.isRunning(), true);
    assert.ok(controller.getRemainingSeconds() > 0);

    controller.stop();
    assert.equal(controller.isRunning(), false);
    assert.equal(controller.getTargetEndTime(), null);
});

test('normalizes a missing restored deadline from the requested duration', () => {
    const controller = createProofingTimerController();
    const beforeStart = Date.now();

    controller.start(20, { targetEndTime: null });
    const target = controller.getTargetEndTime();

    assert.ok(Number.isFinite(target));
    assert.ok(target >= beforeStart + 20_000);
    assert.ok(target <= Date.now() + 20_000);
    controller.stop();
});

test('rejects an expired restored target unless overtime is explicitly enabled', () => {
    const controller = createProofingTimerController();
    const expiredTarget = Date.now() - 2_000;

    assert.equal(controller.start(1, { targetEndTime: expiredTarget }), null);
    assert.equal(controller.isRunning(), false);
    assert.equal(controller.getTargetEndTime(), null);

    let overtimeValue;
    controller.start(1, {
        targetEndTime: expiredTarget,
        allowOvertime: true,
        onOvertime: (seconds) => { overtimeValue = seconds; }
    });

    assert.equal(controller.getTargetEndTime(), expiredTarget);
    assert.equal(typeof overtimeValue, 'number');
    assert.ok(overtimeValue < 0);
    controller.stop();
});

test('rejecting an expired restore does not disturb an already-running timer', () => {
    const controller = createProofingTimerController();
    controller.start(60);
    const activeTarget = controller.getTargetEndTime();

    const result = controller.start(30, { targetEndTime: Date.now() - 1_000 });
    assert.equal(result, null);
    assert.equal(controller.isRunning(), true);
    assert.equal(controller.getTargetEndTime(), activeTarget);
    controller.stop();
});

test('a synchronous onTick callback may stop the timer without leaking an interval', () => {
    const controller = createProofingTimerController();
    let ticks = 0;

    controller.start(10, { onTick: () => { ticks += 1; controller.stop(); } });

    assert.equal(ticks, 1);
    assert.equal(controller.isRunning(), false);
    assert.equal(controller.getTargetEndTime(), null);
});


test('a throwing onTick callback clears its timer before propagating the error', () => {
    const controller = createProofingTimerController();

    assert.throws(() => controller.start(10, {
        onTick() { throw new Error('tick renderer failed'); }
    }), /tick renderer failed/);

    assert.equal(controller.isRunning(), false);
    assert.equal(controller.getTargetEndTime(), null);
});

test('a throwing onOvertime callback clears an expired timer before propagating the error', () => {
    const controller = createProofingTimerController();

    assert.throws(() => controller.start(1, {
        targetEndTime: Date.now() - 2_000,
        allowOvertime: true,
        onOvertime() { throw new Error('overtime renderer failed'); }
    }), /overtime renderer failed/);

    assert.equal(controller.isRunning(), false);
    assert.equal(controller.getTargetEndTime(), null);
});

test('a failed callback from an older generation does not stop a replacement timer', () => {
    const controller = createProofingTimerController();
    let replacementTarget = null;

    assert.throws(() => controller.start(10, {
        onTick() {
            controller.start(20);
            replacementTarget = controller.getTargetEndTime();
            throw new Error('old tick failed after replacement');
        }
    }), /old tick failed after replacement/);

    assert.equal(controller.isRunning(), true);
    assert.equal(controller.getTargetEndTime(), replacementTarget);
    controller.stop();
});


// [AI-GENERATED][QA][V240] Freeze-only stop must preserve the session deadline.
test('stopIntervalOnly freezes ticks but preserves the absolute session deadline', async () => {
    const controller = createProofingTimerController();
    const target = Date.now() - 2_000;
    let ticks = 0;

    controller.start(1, {
        targetEndTime: target,
        allowOvertime: true,
        onOvertime: () => { ticks += 1; }
    });
    assert.equal(controller.getTargetEndTime(), target);
    assert.equal(controller.isRunning(), true);

    controller.stopIntervalOnly();
    assert.equal(controller.isRunning(), false);
    assert.equal(controller.getTargetEndTime(), target);
    const frozenRemaining = controller.getRemainingSeconds();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert.equal(controller.getTargetEndTime(), target);
    assert.equal(controller.getRemainingSeconds(), frozenRemaining - 1);
    assert.equal(ticks, 1, 'no additional overtime ticks should run after interval stop');

    controller.stop();
    assert.equal(controller.getTargetEndTime(), null, 'full stop clears the deadline');
});

// [AI-GENERATED][QA][V245] Interval ID zero is still a valid acquired handle;
// the controller must use its null sentinel rather than JavaScript truthiness.
test('retains and clears an interval whose runtime handle is zero', () => {
    const originalSetInterval = globalThis.setInterval;
    const originalClearInterval = globalThis.clearInterval;
    const cleared = [];
    globalThis.setInterval = () => 0;
    globalThis.clearInterval = (handle) => { cleared.push(handle); };

    try {
        const controller = createProofingTimerController();
        const handle = controller.start(10);

        assert.equal(handle, 0);
        assert.equal(controller.isRunning(), true, 'zero must not be confused with the null sentinel');
        controller.stop();
        assert.equal(controller.isRunning(), false);
        assert.deepEqual(cleared, [0], 'stop must clear the exact acquired interval handle');
    } finally {
        globalThis.setInterval = originalSetInterval;
        globalThis.clearInterval = originalClearInterval;
    }
});

// [AI-GENERATED][QA][V246] Malformed numeric coercion must be rejected without
// throwing through the application startup path or disturbing the active timer.
test('rejects a Symbol duration safely and preserves an already-running timer', () => {
    const controller = createProofingTimerController();
    controller.start(60);
    const activeTarget = controller.getTargetEndTime();

    try {
        let result;
        assert.doesNotThrow(() => { result = controller.start(Symbol('invalid duration')); });
        assert.equal(result, null);
        assert.equal(controller.isRunning(), true);
        assert.equal(controller.getTargetEndTime(), activeTarget);
    } finally {
        controller.stop();
    }
});

test('treats an uncoercible restored deadline as absent and starts from duration', () => {
    const controller = createProofingTimerController();

    assert.doesNotThrow(() => controller.start(20, { targetEndTime: Symbol('invalid deadline') }));
    const target = controller.getTargetEndTime();
    assert.ok(Number.isFinite(target));
    assert.ok(target > Date.now());
    controller.stop();
});
