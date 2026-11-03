/**
 * [AI-GENERATED][ROBUSTNESS][V250] Validate offline gamification cache data.
 * Cache Storage/localStorage is an untrusted persistence boundary: old builds,
 * partial writes, extensions, or manual edits must not poison runtime state.
 */
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateKey(value) {
    if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function finiteNonNegative(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeIdList(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()))];
}

function normalizeQuestList(value) {
    if (!Array.isArray(value)) return [];

    // [AI-GENERATED][BUG FIX][V251] Supabase upsert batches cannot safely contain
    // duplicate rows for the same (quest_id, quest_date) conflict key. Merge old
    // or partially-written cache entries before the queue reaches the network.
    const unique = new Map();
    for (const item of value) {
        if (!item || typeof item !== 'object'
            || typeof item.quest_id !== 'string' || !item.quest_id.trim()
            || !isValidDateKey(item.quest_date)) continue;

        const questId = item.quest_id.trim();
        const key = JSON.stringify([questId, item.quest_date]);
        const completedAt = typeof item.completed_at === 'string' && item.completed_at.trim()
            ? item.completed_at : undefined;
        const existing = unique.get(key);
        if (!existing) {
            unique.set(key, {
                quest_id: questId,
                quest_date: item.quest_date,
                completed: item.completed === true,
                ...(completedAt ? { completed_at: completedAt } : {})
            });
            continue;
        }

        // Completion is monotonic: a duplicate incomplete snapshot must not
        // downgrade a completed quest. Prefer a supplied timestamp when present.
        existing.completed = existing.completed || item.completed === true;
        if (!existing.completed_at && completedAt) existing.completed_at = completedAt;
    }
    return [...unique.values()];
}

function normalizeState(value, defaults) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const lastActive = isValidDateKey(source.last_active_date)
        ? source.last_active_date : null;
    return {
        ...defaults,
        xp: finiteNonNegative(source.xp, defaults.xp),
        level: Math.max(1, Math.floor(finiteNonNegative(source.level, defaults.level))),
        coins: finiteNonNegative(source.coins, defaults.coins),
        streak_days: Math.floor(finiteNonNegative(source.streak_days, defaults.streak_days)),
        last_active_date: lastActive,
        badges: normalizeIdList(source.badges),
        quests: normalizeQuestList(source.quests)
    };
}

function normalizePending(value, defaults) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
        ...defaults,
        xp: finiteNonNegative(source.xp, defaults.xp),
        coins: finiteNonNegative(source.coins, defaults.coins),
        quests: normalizeQuestList(source.quests),
        badges: normalizeIdList(source.badges)
    };
}

export function normalizeGamificationCache(cache, defaultState, defaultPending) {
    if (!cache || typeof cache !== 'object' || Array.isArray(cache)
        || (!cache.state || typeof cache.state !== 'object' || Array.isArray(cache.state))) {
        return { found: false, state: { ...defaultState }, pending: { ...defaultPending } };
    }

    return {
        found: true,
        state: normalizeState(cache.state, defaultState),
        pending: normalizePending(cache.pending, defaultPending)
    };
}
