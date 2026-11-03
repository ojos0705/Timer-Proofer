/** [AI-GENERATED][QA][V250] Regression tests for untrusted offline gamification cache data. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGamificationCache } from '../assets/js/gamification-cache.js';

const defaultState = { xp: 0, level: 1, coins: 0, streak_days: 0, last_active_date: null, badges: [], quests: [] };
const defaultPending = { xp: 0, coins: 0, quests: [], badges: [] };

test('malformed or absent cache becomes a safe cache miss', () => {
    for (const cache of [null, undefined, [], 'bad', { pending: { xp: 20 } }]) {
        const result = normalizeGamificationCache(cache, defaultState, defaultPending);
        assert.equal(result.found, false);
        assert.deepEqual(result.state, defaultState);
        assert.deepEqual(result.pending, defaultPending);
    }
});

test('cache numbers, dates, badges and quests are normalized before runtime use', () => {
    const result = normalizeGamificationCache({
        state: {
            xp: '250', level: '3', coins: -12, streak_days: '2.9',
            last_active_date: 'not-a-date', badges: ['golden_crust', '', 42, 'golden_crust'],
            quests: [
                { quest_id: 'daily_recipe', quest_date: '2026-10-15', completed: true, completed_at: 'now' },
                { quest_id: 5, quest_date: '2026-10-15' },
                { quest_id: 'bad-date', quest_date: 'today' },
                { quest_id: 'impossible-date', quest_date: '2026-02-31' }
            ]
        },
        pending: { xp: '15', coins: '7', quests: [{ quest_id: 'daily_proofing', quest_date: '2026-10-15' }, null], badges: ['golden_crust', 7] }
    }, defaultState, defaultPending);

    assert.equal(result.found, true);
    assert.deepEqual(result.state, {
        ...defaultState, xp: 250, level: 3, coins: 0, streak_days: 2,
        last_active_date: null, badges: ['golden_crust'],
        quests: [{ quest_id: 'daily_recipe', quest_date: '2026-10-15', completed: true, completed_at: 'now' }]
    });
    assert.deepEqual(result.pending, {
        ...defaultPending, xp: 15, coins: 7,
        quests: [{ quest_id: 'daily_proofing', quest_date: '2026-10-15', completed: false }],
        badges: ['golden_crust']
    });
});

test('negative, infinite and nonnumeric pending totals cannot poison future sync deltas', () => {
    const result = normalizeGamificationCache({
        state: { xp: Infinity, coins: 'NaN' },
        pending: { xp: -999, coins: Infinity }
    }, defaultState, defaultPending);
    assert.equal(result.state.xp, 0);
    assert.equal(result.state.coins, 0);
    assert.equal(result.pending.xp, 0);
    assert.equal(result.pending.coins, 0);
});


test('duplicate quest conflict keys are merged before an upsert batch is built', () => {
    const result = normalizeGamificationCache({
        state: {
            quests: [
                { quest_id: 'daily_proofing', quest_date: '2026-10-15', completed: false },
                { quest_id: 'daily_proofing', quest_date: '2026-10-15', completed: true, completed_at: '2026-10-15T03:00:00.000Z' },
                { quest_id: 'daily_recipe', quest_date: '2026-10-15', completed: true }
            ]
        },
        pending: {
            quests: [
                { quest_id: 'daily_proofing', quest_date: '2026-10-15', completed: true },
                { quest_id: 'daily_proofing', quest_date: '2026-10-15', completed: true, completed_at: '2026-10-15T04:00:00.000Z' }
            ]
        }
    }, defaultState, defaultPending);

    assert.deepEqual(result.state.quests, [
        { quest_id: 'daily_proofing', quest_date: '2026-10-15', completed: true, completed_at: '2026-10-15T03:00:00.000Z' },
        { quest_id: 'daily_recipe', quest_date: '2026-10-15', completed: true }
    ]);
    assert.deepEqual(result.pending.quests, [
        { quest_id: 'daily_proofing', quest_date: '2026-10-15', completed: true, completed_at: '2026-10-15T04:00:00.000Z' }
    ]);
});
