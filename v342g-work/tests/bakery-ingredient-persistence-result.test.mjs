/** [AI-GENERATED][QA][V270] Ingredient persistence must propagate storage failures. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('ingredient persistence rejects when StorageService cannot confirm a durable write', async () => {
    const values = new Map();
    let failWrites = false;
    globalThis.window = { Capacitor: null };
    globalThis.localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) {
            if (failWrites) throw new Error('quota exceeded');
            values.set(key, String(value));
        },
        removeItem(key) { values.delete(key); },
        clear() { values.clear(); }
    };

    const { BakeryIngredientService } = await import('../assets/js/bakery-ingredient-service.js?test=persist-result-v270');
    const ingredient = { id: 'yeast-1', name: 'Ragi', category: 'Bahan Kering', ratio: 2, price: 1000, pack: 50 };

    const saved = await BakeryIngredientService.persist([ingredient]);
    assert.equal(saved[0].name, 'Ragi');
    assert.equal(JSON.parse(values.get(BakeryIngredientService.key))[0].name, 'Ragi');

    failWrites = true;
    await assert.rejects(
        BakeryIngredientService.persist([{ ...ingredient, name: 'Ragi Instan' }]),
        (error) => error?.code === 'BAKERY_INGREDIENT_PERSIST_FAILED'
            && /Penyimpanan bahan bakery gagal/.test(error.message)
    );
});

test('app-core consumes ingredient persistence errors and warns instead of leaving a rejected Promise unhandled', () => {
    const source = fs.readFileSync(path.join(root, 'assets/js/app-core.js'), 'utf8');
    const facadeStart = source.indexOf('window.saveBakeryIngredients = function()');
    const facadeEnd = source.indexOf('window.addBakeryIngredient = function', facadeStart);
    assert.ok(facadeStart >= 0 && facadeEnd > facadeStart, 'save facade should remain present');
    const facade = source.slice(facadeStart, facadeEnd);

    assert.match(facade, /BakeryIngredientService\.persist\(snapshot\)/);
    assert.match(facade, /\.catch\(\(error\) => \{/);
    assert.match(facade, /Penyimpanan Bahan Gagal/);
    assert.match(facade, /Belum dipastikan tersimpan|belum dipastikan tersimpan/i);
    assert.match(facade, /return false|console\.error/);
});
