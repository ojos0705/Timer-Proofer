/** [AI-GENERATED][QA][V219] Regression tests for imported ingredient markup. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { escapeHtmlMarkup } from '../assets/js/core/markup-security.js';

const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const renderStart = appCore.indexOf('let htmlContentTable = "";');
const renderEnd = appCore.indexOf('// Jalankan kalkulasi angka berat', renderStart);
assert.ok(renderStart >= 0 && renderEnd > renderStart, 'ingredient renderer source should be present');
const renderer = appCore.slice(renderStart, renderEnd);

test('ingredient names are escaped before insertion into table and card markup', () => {
    assert.match(renderer, /const ingredientNameHtml = escapeHtmlMarkup\(ing\.name \?\? ''\)/);
    assert.match(renderer, /<td style="text-align: left; padding: 5px;">\$\{ingredientNameHtml\}<\/td>/);
    assert.match(renderer, /<span style="font-weight: 700; font-size: 0\.8rem; color: var\(--chocolate\);">\$\{ingredientNameHtml\}<\/span>/);
    assert.doesNotMatch(renderer, /\$\{ing\.name\}/);
});

test('ingredient IDs are escaped for HTML attributes and encoded as JavaScript string literals', () => {
    assert.match(renderer, /const ingredientIdHtml = escapeHtmlMarkup\(ingredientId\)/);
    assert.match(renderer, /const ingredientIdJs = escapeHtmlMarkup\(JSON\.stringify\(ingredientId\)\)/);
    assert.match(renderer, /data-oninput="perbaruiKomponenBahan\(\$\{ingredientIdJs\}, 'ratio', this\.value\)"/);
    assert.match(renderer, /data-oninput="perbaruiKomponenBahan\(\$\{ingredientIdJs\}, 'price', this\.value\)"/);
    assert.match(renderer, /data-oninput="perbaruiKomponenBahan\(\$\{ingredientIdJs\}, 'pack', this\.value\)"/);
    assert.doesNotMatch(renderer, /\$\{ing\.id\}/);
});

test('non-finite ingredient numbers render as zero instead of attacker-controlled markup', () => {
    assert.match(renderer, /const ingredientRatio = Number\.isFinite\(Number\(ing\.ratio\)\) \? Number\(ing\.ratio\) : 0/);
    assert.match(renderer, /const ingredientPrice = Number\.isFinite\(Number\(ing\.price\)\) \? Number\(ing\.price\) : 0/);
    assert.match(renderer, /const ingredientPack = Number\.isFinite\(Number\(ing\.pack\)\) \? Number\(ing\.pack\) : 0/);
    assert.doesNotMatch(renderer, /value="\$\{ing\.(?:ratio|price|pack)\}"/);
});

test('HTML escaping safely neutralizes imported ingredient names and hostile IDs', () => {
    assert.equal(escapeHtmlMarkup(`<img src=x onerror='alert(1)'>`), '&lt;img src=x onerror=&#039;alert(1)&#039;&gt;');
    const hostileId = `x\" onfocus=\"alert(1)`;
    assert.equal(escapeHtmlMarkup(hostileId), 'x&quot; onfocus=&quot;alert(1)');
    assert.equal(escapeHtmlMarkup(JSON.stringify(hostileId)), '&quot;x\\&quot; onfocus=\\&quot;alert(1)&quot;');
});
