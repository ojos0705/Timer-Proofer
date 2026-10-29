/** [AI-GENERATED][QA][V271] Services with known ESM consumers must not depend on unused mutable window aliases. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const removedAliases = [
    ['assets/js/profile-service.js', 'ProfileDataService'],
    ['assets/js/weather-service.js', 'WeatherService'],
    ['assets/js/recipe-domain-service.js', 'RecipeDomainService'],
    ['assets/js/native-capacitor-service.js', 'NativeCapacitorService'],
    ['assets/js/proofing-completion-service.js', 'ProofingCompletionService']
];

test('orphaned service window aliases are removed while named ES-module exports remain', () => {
    for (const [relative, globalName] of removedAliases) {
        const source = read(relative);
        assert.doesNotMatch(source, new RegExp(`window\\.${globalName}\\s*=`), `${relative} must not publish window.${globalName}`);
    }
    assert.match(read('assets/js/profile-service.js'), /export\s+const\s+ProfileService\s*=\s*Object\.freeze\(/);
    assert.match(read('assets/js/weather-service.js'), /export\s+async\s+function\s+fetchWeather\(/);
    assert.match(read('assets/js/weather-service.js'), /export\s+async\s+function\s+fetchElevation\(/);
    assert.match(read('assets/js/recipe-domain-service.js'), /export\s+const\s+RecipeDomainService\s*=\s*Object\.freeze\(/);
    assert.match(read('assets/js/native-capacitor-service.js'), /export\s*\{[^}]*NativeCapacitorService/s);
    assert.match(read('assets/js/proofing-completion-service.js'), /export\s+const\s+ProofingCompletionService\s*=\s*Object\.freeze\(/);
});

test('application consumers import these services without looking up their removed global aliases', () => {
    const appCore = read('assets/js/app-core.js');
    assert.match(appCore, /import\s+\{\s*ProfileService\s+as\s+ProfileDataService\s*\}\s+from\s+['"]\.\/profile-service\.js['"]/);
    assert.match(appCore, /import\s+\{\s*fetchWeather\s*,\s*fetchElevation\s*\}\s+from\s+['"]\.\/weather-service\.js['"]/);
    assert.match(appCore, /import\s+\{\s*RecipeDomainService\s*\}\s+from\s+['"]\.\/recipe-domain-service\.js['"]/);
    assert.match(appCore, /import\s+\{\s*ProofingCompletionService\s*\}\s+from\s+['"]\.\/proofing-completion-service\.js['"]/);
    assert.match(read('assets/js/storage-service.js'), /import\s+\{\s*NativeCapacitorService\s*\}\s+from\s+['"]\.\/native-capacitor-service\.js['"]/);
    assert.doesNotMatch(appCore, /window\.(?:ProfileDataService|WeatherService|RecipeDomainService|ProofingCompletionService)\b/);
});
