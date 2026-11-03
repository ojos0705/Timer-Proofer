/** [AI-GENERATED][QA][V262] Defensive and deterministic language-list filtering tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { filterDaftarBahasa } from '../assets/js/language-list-service.js';

function makeItem({ textContent = '', dataName = '' } = {}) {
    return {
        textContent,
        attributes: { 'data-name': dataName },
        style: { display: 'flex' },
        getAttribute(name) { return this.attributes[name] ?? null; }
    };
}

function makeDocument({ inputValue = '', items = [], includeInput = true, includeContainer = true } = {}) {
    const input = includeInput ? { value: inputValue } : null;
    const container = includeContainer ? {
        getElementsByClassName(className) {
            assert.equal(className, 'lang-item');
            return items;
        }
    } : null;
    return {
        getElementById(id) {
            if (id === 'input-cari-bahasa') return input;
            if (id === 'list-pilihan-bahasa') return container;
            return null;
        }
    };
}

test('language filter is safe when document, input, or list container is missing', () => {
    assert.doesNotThrow(() => filterDaftarBahasa(undefined));
    assert.doesNotThrow(() => filterDaftarBahasa(makeDocument({ includeInput: false })));
    assert.doesNotThrow(() => filterDaftarBahasa(makeDocument({ includeContainer: false })));
});

test('language filter matches visible label case-insensitively and trims search text', () => {
    const indonesia = makeItem({ textContent: 'Bahasa Indonesia' });
    const english = makeItem({ textContent: 'English' });
    const doc = makeDocument({ inputValue: '  INDo ', items: [indonesia, english] });

    filterDaftarBahasa(doc);

    assert.equal(indonesia.style.display, 'flex');
    assert.equal(english.style.display, 'none');
});

test('language filter matches data-name and restores all items for an empty search', () => {
    const french = makeItem({ textContent: 'French', dataName: 'french fr-CA' });
    const japanese = makeItem({ textContent: 'Japanese', dataName: 'japanese ja' });

    filterDaftarBahasa(makeDocument({ inputValue: 'FR-CA', items: [french, japanese] }));
    assert.equal(french.style.display, 'flex');
    assert.equal(japanese.style.display, 'none');

    filterDaftarBahasa(makeDocument({ inputValue: '   ', items: [french, japanese] }));
    assert.equal(french.style.display, 'flex');
    assert.equal(japanese.style.display, 'flex');
});

test('language engine exports filtering and selection functions while keeping only compatibility bridges global', () => {
    const engine = fs.readFileSync(new URL('../assets/js/language-engine.js', import.meta.url), 'utf8');
    const renderer = fs.readFileSync(new URL('../assets/js/lang-renderer.js', import.meta.url), 'utf8');

    assert.match(engine, /import\s+\{\s*filterDaftarBahasa\s*\}\s+from\s+['"]\.\/language-list-service\.js['"]/);
    assert.match(engine, /async function pilihBahasaGlobal\(/);
    assert.match(engine, /window\.pilihBahasaGlobal\s*=\s*pilihBahasaGlobal/);
    assert.match(engine, /export\s+\{[^}]*filterDaftarBahasa[^}]*pilihBahasaGlobal/s);
    assert.match(renderer, /import\s+\{\s*pilihBahasaGlobal\s*\}\s+from\s+['"]\.\/language-engine\.js['"]/);
    assert.doesNotMatch(renderer, /window\.pilihBahasaGlobal/);
});
