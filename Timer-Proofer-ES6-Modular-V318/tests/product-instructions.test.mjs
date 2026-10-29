/** [AI-GENERATED][QA][V223] Product-step resolution, alias, and safe-render regressions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getRecipeInstructionSteps, normalizeRecipeProductKey } from '../assets/js/product-instructions.js';

const appCoreSource = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const serviceWorkerSource = fs.readFileSync(new URL('../www/sw.js', import.meta.url), 'utf8');
const recipeMap = {
    donut: ['Mix flour.', 'Proof the dough.'],
    roti: ['Mix bread dough.'],
    salt_bread: ['Roll the cold butter.']
};

 test('normalizes Indonesian product name donat to the existing donut recipe key', () => {
    assert.equal(normalizeRecipeProductKey('donat'), 'donut');
    assert.deepEqual(getRecipeInstructionSteps(recipeMap, 'donat'), recipeMap.donut);
});

test('normalizes UI IDs and hyphenated product aliases without changing HTML contracts', () => {
    assert.equal(normalizeRecipeProductKey('prod-donut'), 'donut');
    assert.equal(normalizeRecipeProductKey('saltbread'), 'salt_bread');
    assert.equal(normalizeRecipeProductKey('salt-bread'), 'salt_bread');
    assert.deepEqual(getRecipeInstructionSteps(recipeMap, 'prod-saltbread'), recipeMap.salt_bread);
});

test('normalization is case-insensitive and tolerates nullish input', () => {
    assert.equal(normalizeRecipeProductKey('  ROTI  '), 'roti');
    assert.equal(normalizeRecipeProductKey(null), '');
    assert.equal(normalizeRecipeProductKey(undefined), '');
    assert.equal(normalizeRecipeProductKey('constructor'), 'constructor');
    assert.equal(normalizeRecipeProductKey('__proto__'), '__proto__');
});

test('unknown, empty, malformed, or inherited recipe entries use the fallback', () => {
    const fallback = 'Langkah pembuatan belum tersedia untuk produk ini.';
    assert.deepEqual(getRecipeInstructionSteps(recipeMap, 'not-a-product'), [fallback]);
    assert.deepEqual(getRecipeInstructionSteps(recipeMap, ''), [fallback]);
    assert.deepEqual(getRecipeInstructionSteps(null, 'donat'), [fallback]);
    assert.deepEqual(getRecipeInstructionSteps(Object.create({ donut: ['not own data'] }), 'donut'), [fallback]);
    assert.deepEqual(getRecipeInstructionSteps({ donut: [] }, 'donat'), [fallback]);
});

test('product instruction renderer uses the normalized resolver and text nodes, not innerHTML', () => {
    assert.match(appCoreSource, /getRecipeInstructionSteps\(resepProduk, productKey\)/);
    assert.match(appCoreSource, /item\.textContent = String\(step \?\? ''\)/);
    assert.doesNotMatch(appCoreSource, /listContainer\.innerHTML\s*=\s*steps/);
});

test('product instruction helper stays precached for offline boot after V277 cache rollover', () => {
    assert.match(serviceWorkerSource, /\.\/assets\/js\/product-instructions\.js/);
    assert.match(serviceWorkerSource, /Timer-Proofing-v1\.1\.221/);
});

