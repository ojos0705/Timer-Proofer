/** [AI-GENERATED][QA][V288] Exercise ESM/legacy state accessors in an isolated runtime. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');

function evaluateBridge({ property, marker, nextMarker, initialValue }) {
    const start = appCore.indexOf(marker);
    assert.notEqual(start, -1, `marker bridge ${property} harus ada`);
    const end = appCore.indexOf(nextMarker, start + marker.length);
    assert.notEqual(end, -1, `batas akhir bridge ${property} harus ada`);
    const block = appCore.slice(start, end);
    const window = { [property]: initialValue };
    const warnings = [];
    vm.runInNewContext(block, {
        window,
        console: { warn: (...args) => warnings.push(args.join(' ')) }
    }, { filename: `app-core-${property}-bridge.test.js` });
    return { window, warnings };
}

test('bakeryIngredients accessor preserves the initial array and follows legacy reassignment', () => {
    const initial = [{ id: 'starter', name: 'Ragi' }];
    const { window } = evaluateBridge({
        property: 'bakeryIngredients',
        marker: '// [AI-GENERATED][ES6 MODULE STATE BRIDGE][V287]',
        nextMarker: '\nlet isSaving = false;',
        initialValue: initial
    });

    assert.equal(window.bakeryIngredients, initial);
    const replacement = [{ id: 'flour', name: 'Tepung' }];
    window.bakeryIngredients = replacement;
    assert.equal(window.bakeryIngredients, replacement);
    window.bakeryIngredients = { invalid: true };
    assert.equal(Array.from(window.bakeryIngredients).length, 0);
});

test('activeRecipeSteps accessor keeps module and legacy state synchronized', () => {
    const initial = [{ desc: 'Campur bahan' }];
    const { window } = evaluateBridge({
        property: 'activeRecipeSteps',
        marker: '// [AI-GENERATED][ES6 MODULE STATE BRIDGE][V286]',
        nextMarker: '\n// ------------------------------------------------------------\n// INISIALISASI APLIKASI',
        initialValue: initial
    });

    assert.equal(window.activeRecipeSteps, initial);
    const replacement = [{ desc: 'Proofing' }];
    window.activeRecipeSteps = replacement;
    assert.equal(window.activeRecipeSteps, replacement);
    window.activeRecipeSteps = null;
    assert.equal(Array.from(window.activeRecipeSteps).length, 0);
});

test('a non-configurable legacy state property does not crash module evaluation', () => {
    const window = {};
    Object.defineProperty(window, 'bakeryIngredients', {
        configurable: false,
        enumerable: true,
        writable: true,
        value: [{ id: 'legacy' }]
    });
    const warnings = [];
    const start = appCore.indexOf('// [AI-GENERATED][ES6 MODULE STATE BRIDGE][V287]');
    const end = appCore.indexOf('\nlet isSaving = false;', start);
    vm.runInNewContext(appCore.slice(start, end), {
        window,
        console: { warn: (...args) => warnings.push(args.join(' ')) }
    });
    assert.equal(window.bakeryIngredients[0].id, 'legacy');
    assert.ok(warnings.some((message) => message.includes('non-configurable')));
});
