import { StorageService } from './storage-service.js'; // [AI-GENERATED][ES6 MODULE][V267] Canonical persistence dependency.

/**
 * [AI-GENERATED][REFACTOR][V35]
 * Canonical domain + persistence owner for bakery ingredients.
 * Keeps the existing storage key and legacy window facade contracts intact.
 * No DOM operations are performed here.
 */

const BAKERY_INGREDIENTS_KEY = 'bakeryIngredients';
const TOPPING_CATEGORIES = Object.freeze(['Bahan Toping', 'Kemasan']);
let persistenceEpoch = 0;

function clone(value) {
    if (value == null) return value;
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (error) {
        throw new Error(`Data bahan tidak dapat disalin: ${error.message}`);
    }
}

function normalizeName(value) {
    return String(value ?? '').trim();
}

function createId(name, now = Date.now()) {
    const safeName = normalizeName(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'bahan';
    return `${safeName}_${now}`;
}

function normalizeIngredient(input = {}) {
    const category = String(input.category ?? 'Bahan Kering').trim() || 'Bahan Kering';
    const name = normalizeName(input.name ?? input.nama);
    const ratio = Number.parseFloat(input.ratio);
    const price = Number.parseFloat(input.price);
    const pack = Number.parseFloat(input.pack);

    return {
        id: input.id != null && String(input.id).trim() ? String(input.id) : createId(name),
        name,
        type: input.type || (TOPPING_CATEGORIES.includes(category) ? 'Topping' : 'Dough'),
        category,
        ratio: Number.isFinite(ratio) ? ratio : 0,
        price: Number.isFinite(price) ? price : 0,
        pack: Number.isFinite(pack) ? pack : 0,
        isFlour: Boolean(input.isFlour)
    };
}

function loadSync() {
    const data = StorageService.getJSONSync(BAKERY_INGREDIENTS_KEY, []);
    return Array.isArray(data) ? clone(data).map(normalizeIngredient) : [];
}

async function load() {
    // [AI-GENERATED][BUG FIX][V35] Ignore stale hydration when a local mutation
    // happens while native Preferences is being read.
    const epochAtStart = persistenceEpoch;
    const data = await StorageService.getJSON(BAKERY_INGREDIENTS_KEY, []);
    if (epochAtStart !== persistenceEpoch) return null;
    return Array.isArray(data) ? clone(data).map(normalizeIngredient) : [];
}

async function persist(list) {
    persistenceEpoch += 1;
    const normalized = Array.isArray(list) ? list.map(normalizeIngredient) : [];
    const saved = await StorageService.setJSON(BAKERY_INGREDIENTS_KEY, normalized);

    // [AI-GENERATED][ROBUSTNESS][V269] Never report a successful ingredient save
    // when StorageService could not confirm all active persistence backends.
    if (saved !== true) {
        const error = new Error('Penyimpanan bahan bakery gagal atau belum dapat dikonfirmasi.');
        error.code = 'BAKERY_INGREDIENT_PERSIST_FAILED';
        throw error;
    }

    return normalized;
}

function add(list, ingredient) {
    const current = Array.isArray(list) ? [...list] : [];
    const normalized = normalizeIngredient(ingredient);
    if (!normalized.name) throw new Error('Nama bahan wajib diisi.');
    if (normalized.ratio <= 0) throw new Error('Rasio / takaran harus lebih besar dari 0.');
    if (normalized.price <= 0) throw new Error('Harga beli harus lebih besar dari 0.');
    if (normalized.pack <= 0) throw new Error('Ukuran pack harus lebih besar dari 0.');
    current.push(normalized);
    return current;
}

function update(list, id, patch) {
    const current = Array.isArray(list) ? [...list] : [];
    const index = current.findIndex(item => String(item?.id) === String(id));
    if (index < 0) return current;
    current[index] = normalizeIngredient({ ...current[index], ...patch });
    return current;
}

function remove(list, id) {
    return (Array.isArray(list) ? list : [])
        .filter(item => String(item?.id) !== String(id));
}

function reset() {
    return [];
}

function findDuplicate(list, name, category, ignoreId = null) {
    const normalizedName = normalizeName(name).toLocaleLowerCase();
    return (Array.isArray(list) ? list : []).find(item =>
        String(item?.id) !== String(ignoreId ?? '') &&
        normalizeName(item?.name).toLocaleLowerCase() === normalizedName &&
        item?.category === category
    ) || null;
}

function createFromForm({ name, category, ratio, price, pack } = {}) {
    const normalizedCategory = String(category || 'Bahan Kering');
    const normalizedName = normalizeName(name);
    return normalizeIngredient({
        id: createId(normalizedName),
        name: normalizedName,
        type: TOPPING_CATEGORIES.includes(normalizedCategory) ? 'Topping' : 'Dough',
        category: normalizedCategory,
        ratio: Number.parseFloat(ratio) || 0,
        price: Number.parseFloat(price) || 0,
        pack: Number.parseFloat(pack) || 0,
        isFlour: /tepung|terigu/i.test(normalizedName)
    });
}

export const BakeryIngredientService = Object.freeze({
    key: BAKERY_INGREDIENTS_KEY,
    toppingCategories: TOPPING_CATEGORIES,
    clone,
    normalize: normalizeIngredient,
    createId,
    createFromForm,
    loadSync,
    load,
    persist,
    add,
    update,
    remove,
    reset,
    findDuplicate
});

// [AI-GENERATED][COMPATIBILITY] Public bridge for existing runtime diagnostics/tools.
// [AI-GENERATED][ES6 MODULE CLEANUP][V273] BakeryIngredientService is consumed through named ESM imports.
