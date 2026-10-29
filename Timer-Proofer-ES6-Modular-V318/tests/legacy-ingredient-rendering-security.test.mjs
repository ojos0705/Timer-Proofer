/** [AI-GENERATED][QA][V223] Guard the legacy/mobile ingredient renderer against imported markup. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { escapeHtmlMarkup } from '../assets/js/core/markup-security.js';

const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const start = appCore.indexOf('function renderIngredientsTable() {');
const end = appCore.indexOf('function syncInventoryWithProfile()', start);
assert.ok(start >= 0 && end > start, 'legacy ingredient renderer source should be present');
const renderer = appCore.slice(start, end);

test('legacy ingredient table and mobile card escape name and type before HTML insertion', () => {
    assert.match(renderer, /const ingredientNameHtml = escapeHtmlMarkup\(item\.name \?\? ''\)/);
    assert.match(renderer, /const ingredientTypeHtml = escapeHtmlMarkup\(item\.type \?\? ''\)/);
    assert.match(renderer, /\$\{ingredientNameHtml\}/);
    assert.match(renderer, /\$\{ingredientTypeHtml\}/);
    assert.doesNotMatch(renderer, /\$\{item\.(?:name|type)\}/);
});

test('legacy ingredient numeric fields are finite before being rendered', () => {
    assert.match(renderer, /const finiteNumber = value => \{/);
    assert.match(renderer, /return Number\.isFinite\(number\) \? number : 0/);
    assert.match(renderer, /catch \{\s*return 0;/);
    for (const key of ['ratio', 'weight', 'price', 'pack', 'cost']) {
        assert.match(renderer, new RegExp(`const ${key} = (?:Math\.round\()?finiteNumber\(item\.${key}\)\)?`));
    }
    assert.doesNotMatch(renderer, /\$\{item\.(?:ratio|weight|price|pack|cost)\}/);
});

test('malformed imported records cannot break renderer iteration', () => {
    assert.match(renderer, /const ingredients = Array\.isArray\(bakeryIngredients\) \? bakeryIngredients : \[\]/);
    assert.match(renderer, /const item = sourceItem && typeof sourceItem === 'object' \? sourceItem : \{\}/);
});

test('HTML-sensitive ingredient labels are neutralized', () => {
    const hostile = `<img src=x onerror="alert(1)">`;
    assert.equal(escapeHtmlMarkup(hostile), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    assert.equal(escapeHtmlMarkup(`Dry <script>alert(1)</script>`), 'Dry &lt;script&gt;alert(1)&lt;/script&gt;');
});


test('renderer escapes hostile ingredient markup and falls back for non-finite numeric values', () => {
    function makeNode(tagName) {
        return {
            tagName,
            style: {},
            children: [],
            innerHTML: '',
            replaceChildren() { this.children = []; this.innerHTML = ''; },
            appendChild(child) { this.children.push(child); },
        };
    }
    const tableBody = makeNode('tbody');
    const cardsContainer = makeNode('div');
    const documentMock = {
        getElementById(id) {
            if (id === 'recipe-ingredients-body') return tableBody;
            if (id === 'recipe-cards-container') return cardsContainer;
            return null;
        },
        createElement: makeNode,
    };
    const hostileItem = {
        name: '<img src=x onerror="alert(1)">',
        type: '<svg onload="alert(2)">',
        ratio: 'NaN', weight: Infinity, price: '<b>10</b>', pack: 'not-a-number', cost: Symbol('bad-number'),
    };
    const compileRenderer = new Function('document', 'escapeHtmlMarkup', 'bakeryIngredients', `${renderer}\nreturn renderIngredientsTable;`);
    const render = compileRenderer(documentMock, escapeHtmlMarkup, [hostileItem]);

    assert.doesNotThrow(() => render());
    assert.equal(tableBody.children.length, 1);
    assert.equal(cardsContainer.children.length, 1);
    for (const html of [tableBody.children[0].innerHTML, cardsContainer.children[0].innerHTML]) {
        assert.doesNotMatch(html, /<img src=x|<svg onload|<b>10<\/b>/i);
        assert.match(html, /&lt;img src=x onerror=/);
        assert.match(html, /&lt;svg onload=/);
        assert.doesNotMatch(html, /NaN|Infinity/);
        assert.match(html, /0/);
    }
});

test('renderer tolerates a malformed non-array state and non-object records', () => {
    function makeNode(tagName) {
        return { tagName, style: {}, children: [], innerHTML: '', replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); } };
    }
    const tableBody = makeNode('tbody');
    const cardsContainer = makeNode('div');
    const documentMock = {
        getElementById(id) { return id === 'recipe-ingredients-body' ? tableBody : id === 'recipe-cards-container' ? cardsContainer : null; },
        createElement: makeNode,
    };
    const compileRenderer = new Function('document', 'escapeHtmlMarkup', 'bakeryIngredients', `${renderer}\nreturn renderIngredientsTable;`);
    assert.doesNotThrow(() => compileRenderer(documentMock, escapeHtmlMarkup, null)());
    assert.doesNotThrow(() => compileRenderer(documentMock, escapeHtmlMarkup, [null, 'invalid'])());
});
