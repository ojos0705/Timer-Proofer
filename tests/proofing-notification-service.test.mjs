/**
 * [AI-GENERATED][QA][V192] Runtime tests for the native notification scheduler.
 * A fake Capacitor plugin exercises permissions, pending-alarm reconciliation,
 * absolute deadlines, native failures, and schedule/cancel races without a device.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// [AI-GENERATED][QA][V192] native-capacitor-service exposes a browser global;
// install a minimal window before importing it in this Node test environment.
globalThis.window = globalThis.window || { DEBUG: false };
const { createProofingNotificationService, ProofingNotificationService } = await import('../assets/js/proofing-notification-service.js');

const NOW = 1_800_000_000_000;
const silentLogger = Object.freeze({
    log() {},
    warn() {},
    error() {}
});

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function createHarness(overrides = {}) {
    const calls = [];
    const behavior = {
        permission: { display: 'granted' },
        requestPermission: { display: 'granted' },
        pending: { notifications: [] },
        scheduleImpl: async () => undefined,
        cancelImpl: async () => undefined,
        pendingImpl: async () => behavior.pending,
        ...overrides
    };
    const plugin = {
        async checkPermissions() {
            calls.push(['checkPermissions']);
            return behavior.permission;
        },
        async requestPermissions() {
            calls.push(['requestPermissions']);
            return behavior.requestPermission;
        },
        async getPending() {
            calls.push(['getPending']);
            return behavior.pendingImpl();
        },
        async cancel(payload) {
            calls.push(['cancel', payload]);
            return behavior.cancelImpl(payload);
        },
        async schedule(payload) {
            calls.push(['schedule', payload]);
            return behavior.scheduleImpl(payload);
        }
    };
    const service = createProofingNotificationService({
        nativeCapacitorService: {
            isNativePlatform: () => true,
            getPlugin: (name) => name === 'LocalNotifications' ? plugin : null
        },
        logger: silentLogger,
        now: () => NOW,
        debug: () => false
    });
    return { service, plugin, behavior, calls };
}

test('retains the existing singleton method and browser-global contract', () => {
    assert.deepEqual(Object.keys(ProofingNotificationService).sort(), [
        'cancel', 'requestPermission', 'schedule', 'scheduleSeconds'
    ]);
    assert.equal(window.ProofingNotificationService, ProofingNotificationService);
    assert.equal(window.requestNotificationPermission, ProofingNotificationService.requestPermission);
});

test('rejects invalid durations without touching the native plugin', async () => {
    const { service, calls } = createHarness();

    assert.deepEqual(await service.schedule(0), { scheduled: false, reason: 'unsupported-or-invalid-duration' });
    assert.deepEqual(await service.scheduleSeconds(Number.NaN), { scheduled: false, reason: 'unsupported-or-invalid-duration' });
    assert.deepEqual(calls, []);
});

test('permission denial clears the old notification with canonical ID 1', async () => {
    const { service, behavior, calls } = createHarness({
        permission: { display: 'denied' },
        requestPermission: { display: 'denied' }
    });

    const result = await service.scheduleSeconds(30);

    assert.deepEqual(result, { scheduled: false, reason: 'permission-denied' });
    assert.ok(calls.some(([name]) => name === 'requestPermissions'));
    assert.ok(calls.some(([name, payload]) => name === 'cancel' && payload.notifications[0].id === 1));
});

// [AI-GENERATED][QA][V243] Denied permission also needs reliable cleanup of an old alarm.
test('permission denial retries old-alarm cleanup once after a transient cancel failure', async () => {
    let cancelAttempts = 0;
    const { service, calls, behavior } = createHarness({
        permission: { display: 'denied' },
        requestPermission: { display: 'denied' }
    });
    behavior.cancelImpl = async () => {
        cancelAttempts += 1;
        if (cancelAttempts === 1) throw new Error('temporary cancel bridge failure');
    };

    const result = await service.scheduleSeconds(30);

    assert.deepEqual(result, { scheduled: false, reason: 'permission-denied' });
    assert.equal(cancelAttempts, 2);
    assert.equal(calls.filter(([name]) => name === 'schedule').length, 0);
});

test('permission denial reports when stale-alarm cleanup still fails after retry', async () => {
    let cancelAttempts = 0;
    const { service, calls, behavior } = createHarness({
        permission: { display: 'denied' },
        requestPermission: { display: 'denied' }
    });
    behavior.cancelImpl = async () => {
        cancelAttempts += 1;
        throw new Error(`cancel failure ${cancelAttempts}`);
    };

    const result = await service.scheduleSeconds(30);

    assert.deepEqual(result, {
        scheduled: false,
        reason: 'permission-denied',
        cleanupFailed: true
    });
    assert.equal(cancelAttempts, 2);
    assert.equal(calls.filter(([name]) => name === 'schedule').length, 0);
});

test('schedules using an absolute deadline and preserves caller notification content', async () => {
    const { service, calls } = createHarness();
    const targetEndTime = NOW + 45_000;

    const result = await service.schedule(1, {
        targetEndTime,
        title: 'Proofing selesai',
        body: 'Periksa adonan sekarang'
    });

    assert.deepEqual(result, { scheduled: true });
    const scheduleCall = calls.find(([name]) => name === 'schedule');
    assert.ok(scheduleCall, 'expected the native schedule call');
    const notification = scheduleCall[1].notifications[0];
    assert.equal(notification.id, 1);
    assert.equal(notification.title, 'Proofing selesai');
    assert.equal(notification.body, 'Periksa adonan sekarang');
    assert.equal(notification.schedule.at.getTime(), targetEndTime);
});

test('reuses an already-pending alarm when its ISO deadline matches', async () => {
    const targetEndTime = NOW + 60_000;
    const { service, calls, behavior } = createHarness();
    behavior.pendingImpl = async () => ({
        notifications: [{ id: 1, schedule: { at: new Date(targetEndTime).toISOString() } }]
    });

    const result = await service.scheduleSeconds(60, { targetEndTime });

    assert.deepEqual(result, { scheduled: true, reused: true });
    assert.equal(calls.filter(([name]) => name === 'schedule').length, 0);
    assert.equal(calls.filter(([name]) => name === 'cancel').length, 0);
});

test('cleans up a potentially partial native schedule after bridge rejection', async () => {
    const { service, calls, behavior } = createHarness();
    behavior.scheduleImpl = async () => { throw new Error('bridge rejected after dispatch'); };

    const result = await service.scheduleSeconds(20);

    assert.equal(result.scheduled, false);
    assert.equal(result.reason, 'schedule-error');
    assert.match(result.error.message, /bridge rejected/);
    assert.equal(calls.filter(([name]) => name === 'schedule').length, 1);
    assert.ok(calls.filter(([name]) => name === 'cancel').length >= 2,
        'expected replacement cancellation and best-effort failure cleanup');
});


test('handles non-native environments without attempting native notification operations', async () => {
    const calls = [];
    const service = createProofingNotificationService({
        nativeCapacitorService: {
            isNativePlatform: () => false,
            getPlugin: () => { calls.push('getPlugin'); throw new Error('must not be called'); }
        },
        logger: silentLogger,
        now: () => NOW,
        debug: () => false
    });

    assert.deepEqual(await service.scheduleSeconds(10), {
        scheduled: false,
        reason: 'unsupported-or-invalid-duration'
    });
    assert.equal(await service.cancel(), false);
    assert.deepEqual(calls, []);
});

test('contains synchronous native plugin discovery failures', async () => {
    const service = createProofingNotificationService({
        nativeCapacitorService: {
            isNativePlatform: () => true,
            getPlugin: () => { throw new Error('plugin registry is not ready'); }
        },
        logger: silentLogger,
        now: () => NOW,
        debug: () => false
    });

    await assert.doesNotReject(async () => {
        assert.deepEqual(await service.scheduleSeconds(10), {
            scheduled: false,
            reason: 'unsupported-or-invalid-duration'
        });
    });
    assert.equal(await service.cancel(), false);
});

test('falls back to scheduling when pending-notification inspection fails', async () => {
    const { service, calls, behavior } = createHarness();
    behavior.pendingImpl = async () => { throw new Error('getPending unavailable'); };

    const result = await service.scheduleSeconds(30, { targetEndTime: NOW + 30_000 });

    assert.deepEqual(result, { scheduled: true });
    assert.equal(calls.filter(([name]) => name === 'schedule').length, 1);
});

test('does not schedule a notification for an expired absolute deadline', async () => {
    const { service, calls } = createHarness();

    const result = await service.scheduleSeconds(30, { targetEndTime: NOW - 10_000 });

    assert.deepEqual(result, { scheduled: false, reason: 'deadline-expired' });
    assert.equal(calls.filter(([name]) => name === 'schedule').length, 0);
});

test('cancel supersedes a schedule already crossing the native schedule boundary', async () => {
    const enteredSchedule = deferred();
    const finishSchedule = deferred();
    const { service, calls, behavior } = createHarness();
    behavior.scheduleImpl = async () => {
        enteredSchedule.resolve();
        await finishSchedule.promise;
    };

    const scheduling = service.scheduleSeconds(30);
    await enteredSchedule.promise;
    const cancellation = service.cancel();
    finishSchedule.resolve();

    const scheduleResult = await scheduling;
    const cancelResult = await cancellation;

    assert.equal(scheduleResult.scheduled, false);
    assert.equal(scheduleResult.reason, 'superseded');
    assert.equal(cancelResult, true);
    assert.equal(calls.filter(([name]) => name === 'schedule').length, 1);
    assert.ok(calls.filter(([name]) => name === 'cancel').length >= 2,
        'the obsolete alarm must be cleaned and the queued cancel must run');
});

test('cancel supersedes a request while pending-alarm inspection is awaiting the plugin', async () => {
    const enteredPending = deferred();
    const finishPending = deferred();
    const { service, calls, behavior } = createHarness();
    behavior.pendingImpl = async () => {
        enteredPending.resolve();
        await finishPending.promise;
        return { notifications: [] };
    };

    const scheduling = service.scheduleSeconds(30, { targetEndTime: NOW + 30_000 });
    await enteredPending.promise;
    const cancellation = service.cancel();
    finishPending.resolve();

    const scheduleResult = await scheduling;
    const cancelResult = await cancellation;

    assert.equal(scheduleResult.scheduled, false);
    assert.equal(scheduleResult.reason, 'superseded');
    assert.equal(cancelResult, true);
    assert.equal(calls.filter(([name]) => name === 'schedule').length, 0,
        'superseded work must not schedule after pending inspection');
    assert.equal(calls.filter(([name]) => name === 'cancel').length, 1);
});

test('schedule requests supersede each other before an obsolete request can schedule', async () => {
    const enteredPending = deferred();
    const finishPending = deferred();
    const { service, calls, behavior } = createHarness();
    behavior.pendingImpl = async () => {
        enteredPending.resolve();
        await finishPending.promise;
        return { notifications: [] };
    };

    const first = service.scheduleSeconds(20, { targetEndTime: NOW + 20_000 });
    await enteredPending.promise;
    behavior.pendingImpl = async () => ({ notifications: [] });
    const second = service.scheduleSeconds(40, { targetEndTime: NOW + 40_000 });
    finishPending.resolve();

    const firstResult = await first;
    const secondResult = await second;

    assert.equal(firstResult.reason, 'superseded');
    assert.deepEqual(secondResult, { scheduled: true });
    const scheduleCalls = calls.filter(([name]) => name === 'schedule');
    assert.equal(scheduleCalls.length, 1);
    assert.equal(scheduleCalls[0][1].notifications[0].schedule.at.getTime(), NOW + 40_000);
});


// [AI-GENERATED][QA][V242] Regression for a transient native cancellation failure.
test('retries cancellation once before replacing a potentially stale native alarm', async () => {
    let cancelAttempts = 0;
    const { service, calls, behavior } = createHarness();
    behavior.cancelImpl = async () => {
        cancelAttempts += 1;
        if (cancelAttempts === 1) throw new Error('transient cancel bridge failure');
    };

    const targetEndTime = NOW + 35_000;
    const result = await service.scheduleSeconds(35, { targetEndTime });

    assert.deepEqual(result, { scheduled: true });
    assert.equal(cancelAttempts, 2, 'the failed cancel should be retried once');
    assert.equal(calls.filter(([name]) => name === 'schedule').length, 1);
    const scheduleCall = calls.find(([name]) => name === 'schedule');
    assert.equal(scheduleCall[1].notifications[0].schedule.at.getTime(), targetEndTime);
});

// [AI-GENERATED][QA][V243] Explicit stop/cancel uses the same bounded retry policy.
test('public cancel retries one transient native failure and reports success when recovered', async () => {
    let cancelAttempts = 0;
    const { service } = createHarness({
        cancelImpl: async () => {
            cancelAttempts += 1;
            if (cancelAttempts === 1) throw new Error('temporary native cancel failure');
        }
    });

    assert.equal(await service.cancel(), true);
    assert.equal(cancelAttempts, 2);
});

test('public cancel reports failure after two native cancellation failures', async () => {
    let cancelAttempts = 0;
    const { service } = createHarness({
        cancelImpl: async () => {
            cancelAttempts += 1;
            throw new Error(`native cancel failure ${cancelAttempts}`);
        }
    });

    assert.equal(await service.cancel(), false);
    assert.equal(cancelAttempts, 2, 'retry count must remain bounded');
});

test('does not retry a failed cancellation after a newer request supersedes the generation', async () => {
    const enteredFirstCancel = deferred();
    const rejectFirstCancel = deferred();
    let cancelAttempts = 0;
    const { service, calls, behavior } = createHarness();
    behavior.cancelImpl = async () => {
        cancelAttempts += 1;
        if (cancelAttempts === 1) {
            enteredFirstCancel.resolve();
            await rejectFirstCancel.promise;
        }
    };

    const first = service.scheduleSeconds(20, { targetEndTime: NOW + 20_000 });
    await enteredFirstCancel.promise;
    behavior.cancelImpl = async () => { cancelAttempts += 1; };
    const second = service.scheduleSeconds(40, { targetEndTime: NOW + 40_000 });
    rejectFirstCancel.reject(new Error('first cancellation failed'));

    const firstResult = await first;
    const secondResult = await second;
    assert.equal(firstResult.reason, 'superseded');
    assert.deepEqual(secondResult, { scheduled: true });
    assert.equal(calls.filter(([name]) => name === 'schedule').length, 1);
    assert.equal(calls.find(([name]) => name === 'schedule')[1].notifications[0].schedule.at.getTime(), NOW + 40_000);
});

// [AI-GENERATED][QA][V242] A persistent cancellation failure must remain visible.
test('returns an explicit schedule error when both cancellation attempts fail', async () => {
    let cancelAttempts = 0;
    const { service, calls, behavior } = createHarness();
    behavior.cancelImpl = async () => {
        cancelAttempts += 1;
        throw new Error(`cancel failed ${cancelAttempts}`);
    };

    const result = await service.scheduleSeconds(25, { targetEndTime: NOW + 25_000 });

    assert.equal(result.scheduled, false);
    assert.equal(result.reason, 'schedule-error');
    assert.equal(cancelAttempts, 2, 'one initial cancellation and one bounded retry');
    assert.equal(calls.filter(([name]) => name === 'schedule').length, 0,
        'never schedule the replacement when the stale-alarm cancellation is still failing');
});


// [AI-GENERATED][QA][V244] A superseded request waiting in the operation queue
// must not perform permission checks or trigger OS permission prompts.
test('skips permissions for a superseded schedule waiting behind in-flight work', async () => {
    const enteredPending = deferred();
    const finishPending = deferred();
    const { service, calls, behavior } = createHarness();
    behavior.pendingImpl = async () => {
        enteredPending.resolve();
        await finishPending.promise;
        return { notifications: [] };
    };

    const first = service.scheduleSeconds(20, { targetEndTime: NOW + 20_000 });
    await enteredPending.promise;

    const obsolete = service.scheduleSeconds(30, { targetEndTime: NOW + 30_000 });
    behavior.pendingImpl = async () => ({ notifications: [] });
    const current = service.scheduleSeconds(45, { targetEndTime: NOW + 45_000 });
    finishPending.resolve();

    const [firstResult, obsoleteResult, currentResult] = await Promise.all([first, obsolete, current]);

    assert.equal(firstResult.reason, 'superseded');
    assert.equal(obsoleteResult.reason, 'superseded');
    assert.deepEqual(currentResult, { scheduled: true });
    assert.equal(calls.filter(([name]) => name === 'checkPermissions').length, 2,
        'the first in-flight and current request may check permissions; the queued obsolete request must not');
    assert.equal(calls.filter(([name]) => name === 'requestPermissions').length, 0);
    const scheduleCalls = calls.filter(([name]) => name === 'schedule');
    assert.equal(scheduleCalls.length, 1);
    assert.equal(scheduleCalls[0][1].notifications[0].schedule.at.getTime(), NOW + 45_000);
});

// [AI-GENERATED][QA][V244] A request superseded during permission inspection must
// exit before asking the OS to show the permission prompt.
test('does not request notification permission after a newer request supersedes a pending permission check', async () => {
    const enteredCheck = deferred();
    const finishCheck = deferred();
    const calls = [];
    let permissionCheckCount = 0;
    let scheduleCount = 0;
    const plugin = {
        async checkPermissions() {
            permissionCheckCount += 1;
            calls.push(['checkPermissions']);
            if (permissionCheckCount === 1) {
                enteredCheck.resolve();
                await finishCheck.promise;
                return { display: 'denied' };
            }
            return { display: 'granted' };
        },
        async requestPermissions() {
            calls.push(['requestPermissions']);
            return { display: 'granted' };
        },
        async getPending() {
            calls.push(['getPending']);
            return { notifications: [] };
        },
        async cancel(payload) {
            calls.push(['cancel', payload]);
        },
        async schedule(payload) {
            scheduleCount += 1;
            calls.push(['schedule', payload]);
        }
    };
    const service = createProofingNotificationService({
        nativeCapacitorService: {
            isNativePlatform: () => true,
            getPlugin: () => plugin
        },
        logger: silentLogger,
        now: () => NOW,
        debug: () => false
    });

    const obsolete = service.scheduleSeconds(25, { targetEndTime: NOW + 25_000 });
    await enteredCheck.promise;
    const current = service.scheduleSeconds(50, { targetEndTime: NOW + 50_000 });
    finishCheck.resolve();

    const [obsoleteResult, currentResult] = await Promise.all([obsolete, current]);
    assert.equal(obsoleteResult.reason, 'superseded');
    assert.deepEqual(currentResult, { scheduled: true });
    assert.equal(calls.filter(([name]) => name === 'requestPermissions').length, 0,
        'the obsolete request must exit immediately after permission inspection');
    assert.equal(scheduleCount, 1);
    assert.equal(calls.find(([name]) => name === 'schedule')[1].notifications[0].schedule.at.getTime(), NOW + 50_000);
});


// [AI-GENERATED][QA][V244] Invalid calls must be non-mutating with respect to
// notification generations so they cannot cancel an in-flight valid schedule.
test('invalid scheduleSeconds input does not supersede a valid schedule already in progress', async () => {
    const enteredPending = deferred();
    const finishPending = deferred();
    const { service, calls, behavior } = createHarness();
    behavior.pendingImpl = async () => {
        enteredPending.resolve();
        await finishPending.promise;
        return { notifications: [] };
    };

    const targetEndTime = NOW + 35_000;
    const valid = service.scheduleSeconds(35, { targetEndTime });
    await enteredPending.promise;

    const invalidPromise = service.scheduleSeconds(Number.NaN, { targetEndTime: NOW + 5_000 });
    // [AI-GENERATED][QA][V244] Release the native pending check before awaiting the
    // invalid call so this regression remains diagnostic on the older implementation.
    finishPending.resolve();
    const invalid = await invalidPromise;
    assert.deepEqual(invalid, { scheduled: false, reason: 'unsupported-or-invalid-duration' });

    assert.deepEqual(await valid, { scheduled: true });
    assert.equal(calls.filter(([name]) => name === 'schedule').length, 1);
    assert.equal(calls.find(([name]) => name === 'schedule')[1].notifications[0].schedule.at.getTime(), targetEndTime);
});
