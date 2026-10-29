/**
 * [AI-GENERATED][REFACTOR][V221] Normalize product aliases used by the recipe
 * instructions UI without changing established HTML IDs or data attributes.
 */
const PRODUCT_KEY_ALIASES = Object.freeze({
    donat: 'donut',
    saltbread: 'salt_bread'
});

export function normalizeRecipeProductKey(value) {
    const normalized = String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .replace(/^prod_/, '');

    return Object.prototype.hasOwnProperty.call(PRODUCT_KEY_ALIASES, normalized)
        ? PRODUCT_KEY_ALIASES[normalized]
        : normalized;
}

/** Resolve only explicitly owned recipe entries; inherited object keys are not data. */
export function getRecipeInstructionSteps(recipeMap, productKey, fallbackText = 'Langkah pembuatan belum tersedia untuk produk ini.') {
    if (!recipeMap || typeof recipeMap !== 'object') return [fallbackText];

    const key = normalizeRecipeProductKey(productKey);
    if (!Object.prototype.hasOwnProperty.call(recipeMap, key)) return [fallbackText];

    const steps = recipeMap[key];
    return Array.isArray(steps) && steps.length > 0 ? steps : [fallbackText];
}
