/** [AI-GENERATED][QA][V264] Keep runtime auth initialization on ES modules and after boot hooks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../assets/js/', import.meta.url);
const entry = fs.readFileSync(new URL('runtime-entry.js', root), 'utf8');
const auth = fs.readFileSync(new URL('auth-service.js', root), 'utf8');

 test('runtime entry initializes AuthService through an ESM import after boot resolves', () => {
    assert.match(entry, /import\('\.\/auth-service\.js'\)[\s\S]*\.then\(\(\{ AuthService \}\) => \{[\s\S]*AuthService\.getClient\?\.\(\)[\s\S]*AuthService\.init\?\.\(\)/);
    assert.match(entry, /await import\('\.\/boot\.js\?v=20261031-v329'\)[\s\S]*applicationBooted = true[\s\S]*initializeAuthServiceModuleAfterBoot\(\)/);
    assert.doesNotMatch(entry, /window\.AuthService/, 'runtime entry must not resolve auth through a mutable global');
    assert.doesNotMatch(entry, /await initializeSupabaseSdkBridge\(\)/, 'SDK network latency must not block the timer boot');
});

test('AuthService remains an explicit named export without an unused window bridge', () => {
    assert.match(auth, /export const AuthService = Object\.freeze\(/);
    assert.doesNotMatch(auth, /window\.AuthService\s*=\s*AuthService/);
});
