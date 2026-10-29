/** [AI-GENERATED][QA][V287] Prevent duplicate module/global bakery ingredient state. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');

test('bakery ingredient state is initialized from the existing legacy array', () => {
    assert.match(appCore, /let bakeryIngredients = Array\.isArray\(window\.bakeryIngredients\)[\s\S]*?\? window\.bakeryIngredients[\s\S]*?: \[\];/);
});

test('legacy bakery ingredient assignments use an accessor connected to the module binding', () => {
    assert.match(appCore, /Object\.defineProperty\(window, 'bakeryIngredients', \{[\s\S]*?get\(\) \{[\s\S]*?return bakeryIngredients;[\s\S]*?\}[\s\S]*?set\(nextIngredients\) \{[\s\S]*?bakeryIngredients = Array\.isArray\(nextIngredients\) \? nextIngredients : \[\];/);
    assert.match(appCore, /BakeryIngredients\] Gagal memasang bridge state bahan bakery/);
});
