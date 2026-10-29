/** [AI-GENERATED][QA][V219] Regression checks for partial article-modal DOM safety. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const start = source.indexOf('function bukaArtikelLengkap(id) {');
const end = source.indexOf('// FUNGSI UNTUK MENUTUP KEMBALI HALAMAN ARTIKEL', start);
assert.ok(start >= 0 && end > start, 'article modal function should exist');
const fn = source.slice(start, end);

test('article modal checks each existing DOM node before updating it', () => {
    assert.match(fn, /if \(badgeElement\) badgeElement\.textContent/);
    assert.match(fn, /if \(titleElement\) titleElement\.textContent/);
    assert.match(fn, /if \(bodyElement && typeof artikel\.content === 'string'\) bodyElement\.innerHTML/);
    assert.match(fn, /if \(overlay\) overlay\.classList\.add\('active'\)/);
    assert.doesNotMatch(fn, /document\.getElementById\('modal-(?:badge|title|body)'\)\.innerText/);
});

test('article badge and title use text-only DOM sinks', () => {
    assert.match(fn, /badgeElement\.textContent = String\(artikel\.badge \?\? ''\)/);
    assert.match(fn, /titleElement\.textContent = String\(artikel\.title \?\? ''\)/);
});
