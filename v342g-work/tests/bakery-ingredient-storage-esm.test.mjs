/** [AI-GENERATED][QA][V267] BakeryIngredientService must use the canonical StorageService ESM binding. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ingredientSource = fs.readFileSync(path.join(root, 'assets/js/bakery-ingredient-service.js'), 'utf8');
const releaseVerifier = fs.readFileSync(path.join(root, 'scripts/verify-release.mjs'), 'utf8');

test('BakeryIngredientService imports StorageService through a named ES module binding', () => {
    assert.match(ingredientSource, /import\s+\{\s*StorageService\s*\}\s+from\s+['"]\.\/storage-service\.js['"]/);
    assert.match(ingredientSource, /StorageService\.getJSONSync\(/);
    assert.match(ingredientSource, /StorageService\.getJSON\(/);
    assert.match(ingredientSource, /StorageService\.setJSON\(/);
    assert.doesNotMatch(ingredientSource, /window\.StorageService/);
});

test('release verifier prevents regressions to the mutable StorageService global', () => {
    assert.match(releaseVerifier, /bakery-ingredient-service\.js[\s\S]*?StorageService harus diimpor melalui named export ES6 Module/);
});

test('ingredient persistence keeps working when the legacy StorageService global is unavailable', async () => {
    const values = new Map();
    globalThis.window = { Capacitor: null };
    globalThis.localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); },
        clear() { values.clear(); }
    };

    const { BakeryIngredientService } = await import('../assets/js/bakery-ingredient-service.js?test=v270');
    const key = BakeryIngredientService.key;
    const existing = [{ id: 'yeast-1', name: 'Ragi', category: 'Bahan Kering', ratio: 2, price: 1000, pack: 50 }];
    values.set(key, JSON.stringify(existing));

    // [AI-GENERATED][QA][V267] Deliberately remove only the compatibility facade.
    // The service should continue working through its immutable module binding.
    globalThis.window.StorageService = undefined;
    assert.equal(BakeryIngredientService.loadSync()[0]?.name, 'Ragi');
    assert.equal((await BakeryIngredientService.load())[0]?.name, 'Ragi');

    await BakeryIngredientService.persist([{ ...existing[0], name: 'Ragi Instan' }]);
    assert.equal(JSON.parse(values.get(key))[0]?.name, 'Ragi Instan');
    assert.equal(globalThis.window.StorageService, undefined);
});
