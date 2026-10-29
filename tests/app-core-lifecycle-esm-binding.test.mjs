/** [AI-GENERATED][QA][V268] app-core consumes the lifecycle API through its canonical ESM binding. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const boot = fs.readFileSync(new URL('../assets/js/boot.js', import.meta.url), 'utf8');
const lifecycle = fs.readFileSync(new URL('../assets/js/app-lifecycle-service.js', import.meta.url), 'utf8');

test('app-core imports and invokes the canonical lifecycle initializer directly', () => {
    assert.match(appCore, /import\s+\{\s*init\s+as\s+initializeAppLifecycle\s*\}\s+from\s+['\"]\.\/app-lifecycle-service\.js['\"]/);
    assert.match(appCore, /initializeAppLifecycle\(\{[\s\S]*?onForeground:[\s\S]*?onBackground:/);
    assert.doesNotMatch(appCore, /window\.AppLifecycleService\?\.init/);
});

test('boot and app-core share the same module URL while the legacy facade remains available', () => {
    assert.match(boot, /import\s+['\"]\.\/app-lifecycle-service\.js['\"]/);
    assert.match(lifecycle, /export\s*\{\s*init\s*,\s*destroy\s*,\s*isNativeApp\s*\}/);
    assert.match(lifecycle, /window\.AppLifecycleService\s*=\s*\{/);
});
