/**
 * [AI-GENERATED][ES6 MODULE][V280]
 * Decide whether a recipe save may replace separately persisted photo slots.
 * A failed async restore must never be interpreted as an intentional empty set.
 */
function normalizeId(value) {
    if (value == null || value === '') return null;
    return String(value);
}

export function shouldPersistRecipePhotos({
    expectedOwnerId,
    recipeId,
    editingRecipeId,
    restoreOutcome,
    photoMutationEpochAtSave
} = {}) {
    const normalizedRecipeId = normalizeId(recipeId);
    const normalizedEditingId = normalizeId(editingRecipeId);

    // New recipes have no previous persisted photo set to protect.
    if (normalizedEditingId === null) {
        return { allowed: true, reason: 'new-recipe' };
    }

    if (!normalizedRecipeId || normalizedEditingId !== normalizedRecipeId) {
        return { allowed: false, reason: 'recipe-mismatch' };
    }

    const outcomeMatchesRecipe = normalizeId(restoreOutcome?.recipeId) === normalizedRecipeId;
    if (!outcomeMatchesRecipe) {
        return { allowed: false, reason: 'restore-outcome-missing' };
    }

    // A successful restore establishes that the current slots faithfully reflect
    // the persisted set for this owner and recipe, including an intentionally empty set.
    if (
        restoreOutcome.status === 'restored' &&
        normalizeId(restoreOutcome.ownerId) === normalizeId(expectedOwnerId) &&
        normalizeId(expectedOwnerId) !== null
    ) {
        return { allowed: true, reason: 'restore-confirmed' };
    }

    // When restore failed or became stale, allow replacement only if the user
    // explicitly changed photo slots after that restore began. The save transaction
    // separately pins and validates the currently active owner before commit.
    const startedAt = Number(restoreOutcome.mutationEpochAtStart);
    const savedAt = Number(photoMutationEpochAtSave);
    if (Number.isFinite(startedAt) && Number.isFinite(savedAt) && savedAt > startedAt) {
        return { allowed: true, reason: 'explicit-photo-mutation' };
    }

    return { allowed: false, reason: 'restore-not-confirmed' };
}
