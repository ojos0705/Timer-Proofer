/** [AI-GENERATED][ES6 MODULE][V267] Regression coverage for the ESM-only language-data boundary. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { daftarBahasa } from '../assets/js/lang-data.js';

const languageDataSource = fs.readFileSync(new URL('../assets/js/lang-data.js', import.meta.url), 'utf8');
const languageRendererSource = fs.readFileSync(new URL('../assets/js/lang-renderer.js', import.meta.url), 'utf8');

test('language data is importable as a standalone ESM module without browser globals', () => {
    assert.ok(Array.isArray(daftarBahasa));
    assert.ok(daftarBahasa.length > 0);
    assert.ok(daftarBahasa.some((language) => language.code === 'id' && language.name === 'Bahasa Indonesia'));
    assert.ok(daftarBahasa.every((language) => typeof language.code === 'string' && language.code.length > 0));
    assert.ok(daftarBahasa.every((language) => typeof language.name === 'string' && language.name.length > 0));
});

test('language codes are unique to avoid ambiguous selection and duplicate list entries', () => {
    const codes = daftarBahasa.map(({ code }) => code);
    assert.equal(new Set(codes).size, codes.length, 'language codes must be unique');
});

test('all in-repository language-list rendering uses the ESM export, not window.daftarBahasa', () => {
    assert.match(languageDataSource, /export\s+const\s+daftarBahasa\s*=/);
    assert.doesNotMatch(languageDataSource, /window\.daftarBahasa/);
    assert.match(languageRendererSource, /import\s+\{\s*daftarBahasa\s*\}\s+from\s+['"]\.\/lang-data\.js['"]/);
    assert.doesNotMatch(languageRendererSource, /window\.daftarBahasa/);
});
