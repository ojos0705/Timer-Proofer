/** [AI-GENERATED][QA][V261] Verify offline localization is consumed as a first-class ES6 Module. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulePath = path.join(root, 'assets/js/offline-i18n.js');
const enginePath = path.join(root, 'assets/js/language-engine.js');
const corePath = path.join(root, 'assets/js/app-core.js');
const bootPath = path.join(root, 'assets/js/boot.js');
const manifestPath = path.join(root, 'assets/js/module-manifest.js');

test('OfflineI18n exports the canonical object via ESM and retains a compatibility bridge', async () => {
    const priorWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const priorDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const windowRef = { addEventListener() {} };
    const documentRef = {
        readyState: 'loading',
        addEventListener() {}
    };

    try {
        Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: windowRef });
        Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: documentRef });
        const moduleUrl = `${pathToFileURL(modulePath).href}?test=v262-offline-i18n`;
        const module = await import(moduleUrl);

        assert.equal(typeof module.OfflineI18n, 'object');
        assert.equal(typeof module.OfflineI18n.apply, 'function');
        assert.equal(typeof module.OfflineI18n.reset, 'function');
        assert.equal(typeof module.OfflineI18n.hasPack, 'function');
        assert.equal(module.OfflineI18n.current(), 'id');
        assert.equal(module.OfflineI18n.isOffline('id'), true);
        assert.equal(windowRef.OfflineI18n, module.OfflineI18n);
    } finally {
        if (priorWindow) Object.defineProperty(globalThis, 'window', priorWindow);
        else delete globalThis.window;
        if (priorDocument) Object.defineProperty(globalThis, 'document', priorDocument);
        else delete globalThis.document;
    }
});

test('language engine and app core import OfflineI18n instead of consuming its mutable global', () => {
    const source = fs.readFileSync(modulePath, 'utf8');
    const engine = fs.readFileSync(enginePath, 'utf8');
    const core = fs.readFileSync(corePath, 'utf8');
    const boot = fs.readFileSync(bootPath, 'utf8');
    const manifest = fs.readFileSync(manifestPath, 'utf8');

    assert.match(source, /export\s+const\s+OfflineI18n\s*=\s*\{/);
    assert.match(source, /global\.OfflineI18n\s*=\s*OfflineI18n/);
    assert.match(source, /import\s+\{\s*OFFLINE_LANG_PACKS\s*,\s*OFFLINE_LANG_ALIASES\s*\}\s+from\s+['"]\.\/lang-packs\.js['"]/);
    assert.doesNotMatch(source, /global\.OFFLINE_LANG_(?:PACKS|ALIASES)/);
    assert.doesNotMatch(source, /^\s*\(function\s*\(global\)/m);
    assert.match(engine, /import\s+\{\s*OfflineI18n\s*\}\s+from\s+['"]\.\/offline-i18n\.js['"]/);
    assert.match(core, /import\s+\{\s*OfflineI18n\s*\}\s+from\s+['"]\.\/offline-i18n\.js['"]/);
    assert.doesNotMatch(engine, /window\.OfflineI18n/);
    assert.doesNotMatch(core, /window\.OfflineI18n/);
    assert.match(manifest, /offline-i18n\.js/);
    assert.match(boot, /import\s+['"]\.\/language-engine\.js['"]/);
});
