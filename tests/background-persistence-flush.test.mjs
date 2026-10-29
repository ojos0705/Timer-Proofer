/** [AI-GENERATED][QA][V235] Background lifecycle flushes must be awaited and failure-isolated. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const appCoreSource = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const helperStart = appCoreSource.indexOf('async function flushBackgroundPersistence()');
const helperEnd = appCoreSource.indexOf('\n\n// [AI-GENERATED][REFACTOR][V37] Single application lifecycle owner.', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'canonical background flush helper must exist');
const helperSource = appCoreSource.slice(helperStart, helperEnd);

function createContext({ proofingFlush, gamificationFlush } = {}) {
    const calls = [];
    const warnings = [];
    const context = {
        ProofingService: {
            flushPersistence: proofingFlush || (async () => { calls.push('proofing'); return true; })
        },
        GamificationModule: gamificationFlush === null ? undefined : {
            flush: gamificationFlush || (async () => { calls.push('gamification'); })
        },
        console: {
            warn: (...args) => warnings.push(args),
            error() {},
            log() {}
        }
    };
    vm.runInNewContext(`${helperSource}\nthis.__flush = flushBackgroundPersistence; this.__handleBackground = runBackgroundLifecycleTasks;`, context);
    return { context, calls, warnings };
}

test('background lifecycle continues to gamification when proofing persistence rejects', async () => {
    const { context, calls, warnings } = createContext({
        proofingFlush: async () => { calls.push('proofing'); throw new Error('proofing flush failed'); },
        gamificationFlush: async () => { calls.push('gamification'); }
    });

    await assert.doesNotReject(context.__flush());
    assert.deepEqual(calls, ['proofing', 'gamification']);
    assert.ok(warnings.some(([message]) => String(message).includes('Flush state/log proofing gagal')));
});

test('background lifecycle observes and contains a rejected gamification flush', async () => {
    const { context, calls, warnings } = createContext({
        proofingFlush: async () => { calls.push('proofing'); return true; },
        gamificationFlush: async () => { calls.push('gamification'); throw new Error('gamification flush failed'); }
    });

    await assert.doesNotReject(context.__flush());
    assert.deepEqual(calls, ['proofing', 'gamification']);
    assert.ok(warnings.some(([message]) => String(message).includes('Flush gamifikasi gagal')));
});

test('background lifecycle waits for gamification persistence to settle', async () => {
    let releaseGamification;
    const { context, calls } = createContext({
        proofingFlush: async () => { calls.push('proofing'); return true; },
        gamificationFlush: () => {
            calls.push('gamification-start');
            return new Promise((resolve) => { releaseGamification = resolve; });
        }
    });

    let completed = false;
    const flushPromise = context.__flush().then(() => { completed = true; });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(typeof releaseGamification, 'function', 'gamification flush should have started');
    assert.equal(completed, false, 'background flush must remain pending until the native/domain flush settles');
    releaseGamification();
    await flushPromise;
    assert.equal(completed, true);
    assert.deepEqual(calls, ['proofing', 'gamification-start']);
});

test('a partial proofing flush result is reported but does not suppress gamification', async () => {
    const { context, calls, warnings } = createContext({
        proofingFlush: async () => { calls.push('proofing'); return false; },
        gamificationFlush: async () => { calls.push('gamification'); }
    });

    await context.__flush();
    assert.deepEqual(calls, ['proofing', 'gamification']);
    assert.ok(warnings.some(([message]) => String(message).includes('data tertahan untuk pemulihan berikutnya')));
});

test('the registered app background callback delegates to the failure-isolated helper', () => {
    const lifecycleStart = appCoreSource.indexOf('initializeAppLifecycle({');
    const lifecycleEnd = appCoreSource.indexOf('// [AI-GENERATED][ROBUSTNESS][V137] pagehide', lifecycleStart);
    const lifecycleBlock = appCoreSource.slice(lifecycleStart, lifecycleEnd);
    assert.ok(lifecycleStart >= 0 && lifecycleEnd > lifecycleStart, 'app lifecycle callback block must exist');
    assert.match(lifecycleBlock, /onBackground:\s*async\s*\(\)\s*=>\s*\{[\s\S]*?await runBackgroundLifecycleTasks\(\{/);
    assert.doesNotMatch(lifecycleBlock, /void\s+GamificationModule\.flush\(\)/);
});


test('synchronous clock-stop or timer-snapshot errors do not skip the durable background flush', async () => {
    const sequence = [];
    const warnings = [];
    const context = {
        console: { warn: (...args) => warnings.push(args), error() {}, log() {} }
    };
    vm.runInNewContext(`${helperSource}\nthis.__handleBackground = runBackgroundLifecycleTasks;`, context);

    await assert.doesNotReject(context.__handleBackground({
        stopClock() { sequence.push('stop-clock'); throw new Error('clock stop failed'); },
        shouldPersistTimer: true,
        persistTimer() { sequence.push('snapshot'); throw new Error('snapshot failed'); },
        async flushPersistence() { sequence.push('flush'); }
    }));

    assert.deepEqual(sequence, ['stop-clock', 'snapshot', 'flush']);
    assert.equal(warnings.length, 2, 'both synchronous failures should be reported independently');
});

test('background lifecycle registration delegates preparation and persistence to the guarded helper', () => {
    const lifecycleStart = appCoreSource.indexOf('initializeAppLifecycle({');
    const lifecycleEnd = appCoreSource.indexOf('// [AI-GENERATED][ROBUSTNESS][V137] pagehide', lifecycleStart);
    const lifecycleBlock = appCoreSource.slice(lifecycleStart, lifecycleEnd);
    assert.match(lifecycleBlock, /onBackground:\s*async\s*\(\)\s*=>\s*\{[\s\S]*?await runBackgroundLifecycleTasks\(\{/);
    assert.match(lifecycleBlock, /flushPersistence:\s*flushBackgroundPersistence/);
});
