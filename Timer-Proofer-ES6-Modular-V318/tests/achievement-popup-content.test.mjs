/** [AI-GENERATED][QA][V249] Regression coverage for achievement popup content. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const start = source.indexOf('window.tampilkanPopupAchievement = function(judul, desc) {');
assert.notEqual(start, -1, 'achievement popup function must remain exported under its existing public name');
const end = source.indexOf('\n}', start) + 2;
const functionSource = source.slice(start, end);

function createElement() {
    const classes = new Set();
    return {
        textContent: '',
        classList: { add(name) { classes.add(name); }, contains(name) { return classes.has(name); } }
    };
}

test('achievement popup displays title and description as text without interpreting markup', () => {
    const popup = createElement();
    const title = createElement();
    const description = createElement();
    const elements = new Map([
        ['achievement-popup', popup],
        ['achievement-title', title],
        ['ach-desc', description]
    ]);
    const window = {};
    vm.runInNewContext(functionSource, { window, document: { getElementById: (id) => elements.get(id) ?? null }, console });

    const maliciousTitle = '<img src=x onerror=alert(1)>';
    assert.equal(window.tampilkanPopupAchievement(maliciousTitle, '100 Resep'), true);
    assert.equal(title.textContent, maliciousTitle);
    assert.equal(description.textContent, '100 Resep');
    assert.equal(popup.classList.contains('show'), true);
});

test('achievement popup safely reports missing popup element', () => {
    const warnings = [];
    const window = {};
    vm.runInNewContext(functionSource, {
        window,
        document: { getElementById: () => null },
        console: { warn: (...args) => warnings.push(args) }
    });
    assert.equal(window.tampilkanPopupAchievement('Title', 'Description'), false);
    assert.equal(warnings.length, 1);
});
