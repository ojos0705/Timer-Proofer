/** [AI-GENERATED][QA][V273] Service APIs with module consumers must not leak mutable global aliases. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const serviceContracts = [
    ['assets/js/auth-service.js', 'AuthService'],
    ['assets/js/storage-service.js', 'StorageService'],
    ['assets/js/bakery-ingredient-service.js', 'BakeryIngredientService']
];

test('AuthService, StorageService, and BakeryIngredientService keep named ESM exports without window aliases', () => {
    for (const [relative, name] of serviceContracts) {
        const source = read(relative);
        assert.match(source, new RegExp(`export\\s+const\\s+${name}\\s*=\\s*Object\\.freeze\\(`), `${name} named export must remain available`);
        assert.doesNotMatch(source, new RegExp(`window\\.${name}\\s*=`), `${name} must not be re-published to window`);
    }
});

test('canonical runtime consumers bind each service through ES6 Module imports', () => {
    const appCore = read('assets/js/app-core.js');
    const runtimeEntry = read('assets/js/runtime-entry.js');
    assert.match(appCore, /import\s+\{\s*AuthService\s*\}\s+from\s+['"]\.\/auth-service\.js['"]/);
    assert.match(runtimeEntry, /import\(['"]\.\/auth-service\.js['"]\)[\s\S]*?\.then\(\(\{\s*AuthService\s*\}\)/);
    assert.match(appCore, /import\s+\{\s*StorageService\s*\}\s+from\s+['"]\.\/storage-service\.js['"]/);
    assert.match(appCore, /import\s+\{\s*BakeryIngredientService\s*\}\s+from\s+['"]\.\/bakery-ingredient-service\.js['"]/);
    assert.doesNotMatch(appCore, /window\.(?:AuthService|StorageService|BakeryIngredientService)/);
});

test('release verifier prevents removed service globals from returning', () => {
    const verifier = read('scripts/verify-release.mjs');
    for (const name of ['AuthService', 'StorageService', 'BakeryIngredientService']) {
        assert.match(verifier, new RegExp(`globalName: '${name}'`));
    }
    assert.match(verifier, /window\.\$\{contract\.globalName\}/);
});
