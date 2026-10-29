/**
 * [AI-GENERATED][REFACTOR][V34]
 * Canonical domain operations for recipes.
 * No DOM, storage, Supabase, or UI side effects are accessed here.
 */

function cloneRecipeValue(value) {
    if (value == null) return value;
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (error) {
        throw new Error(`Data resep tidak dapat disalin: ${error.message}`);
    }
}

function normalizeRecipeName(value, fallback = 'Tanpa Nama') {
    const name = String(value ?? '').trim();
    return name || fallback;
}

function createRecipeId(name, editingId = null, now = Date.now()) {
    if (editingId != null && String(editingId).trim() !== '') return String(editingId);
    const normalized = normalizeRecipeName(name, 'resep')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    return `resep_${normalized || 'resep'}_${now}`;
}

function buildRecipe({
    name,
    flourWeight = 1000,
    targetYield = 1,
    salePrice = 0,
    ingredients = [],
    productionSteps = [],
    editingId = null,
    savedAt = new Date().toISOString()
} = {}) {
    const recipeName = normalizeRecipeName(name);

    return {
        id: createRecipeId(recipeName, editingId),
        nama: recipeName,
        tepungUtama: Number.parseFloat(flourWeight) || 0,
        targetYield: Number.parseInt(targetYield, 10) || 1,
        hargaJual: Number.parseFloat(salePrice) || 0,
        bahanBaku: cloneRecipeValue(Array.isArray(ingredients) ? ingredients : []),
        langkahProduksi: cloneRecipeValue(Array.isArray(productionSteps) ? productionSteps : []),
        waktuSimpan: savedAt
    };
}

function duplicateRecipe(recipe, now = Date.now()) {
    if (!recipe || typeof recipe !== 'object') {
        throw new Error('Data resep tidak valid untuk disalin.');
    }

    const copy = cloneRecipeValue(recipe);
    const originalName = normalizeRecipeName(copy.nama || copy.name);

    return {
        ...copy,
        id: `resep_${now}`,
        nama: `${originalName} (Salinan)`,
        waktuSimpan: new Date(now).toISOString()
    };
}

function upsertRecipeInList(recipeList, recipe) {
    const list = Array.isArray(recipeList) ? [...recipeList] : [];
    if (!recipe || recipe.id == null) throw new Error('Data resep tidak valid.');

    const index = list.findIndex(item => String(item?.id) === String(recipe.id));
    if (index >= 0) list[index] = recipe;
    else list.push(recipe);
    return list;
}

function removeRecipeFromList(recipeList, recipeId) {
    const list = Array.isArray(recipeList) ? recipeList : [];
    return list.filter(item => String(item?.id) !== String(recipeId));
}

function isSameRecipeName(left, right) {
    return normalizeRecipeName(left).toLocaleLowerCase() === normalizeRecipeName(right).toLocaleLowerCase();
}

export const RecipeDomainService = Object.freeze({
    clone: cloneRecipeValue,
    normalizeName: normalizeRecipeName,
    createId: createRecipeId,
    build: buildRecipe,
    duplicate: duplicateRecipe,
    upsertInList: upsertRecipeInList,
    removeFromList: removeRecipeFromList,
    isSameName: isSameRecipeName
});

