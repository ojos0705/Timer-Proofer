/** [AI-GENERATED][QA][V263] Verify modal internals consume canonical ES module exports. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../assets/js/', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');

test('modal bootstrap exports the canonical core and safe scroll-lock function', () => {
    const source = read('modal-bootstrap.js');
    assert.match(source, /export\s+function\s+getModalCore\(/);
    assert.match(source, /export\s+function\s+syncModalBodyScrollLock\(/);
    assert.match(source, /modalCoreInstance\s*=\s*Object\.freeze\(/);
    assert.match(source, /window\.__TPModalCore\s*=\s*modalCoreInstance/);
});

test('in-repository consumers import the scroll-lock API instead of reading the mutable global', () => {
    const consumers = [
        'app-core.js',
        'app-lifecycle-service.js',
        'language-engine.js',
        'notification-service.js',
        'modal.js'
    ];
    for (const name of consumers) {
        const source = read(name);
        assert.match(source, /import\s+\{[^}]*syncModalBodyScrollLock[^}]*\}\s+from\s+[\"']\.\/modal-bootstrap\.js\?v=20261030-v322[\"']/ , name);
        assert.doesNotMatch(source, /window\.__TPModalCore/, `${name} should not read mutable modal core global`);
    }
});

test('module manifest records modal bootstrap as the canonical modal-core owner', () => {
    assert.match(read('module-manifest.js'), /foundation:\s*\['modal-bootstrap\.js'/);
});


test('all modal-core consumers share the exact same cache-busted module URL', () => {
    const entry = read('runtime-entry.js');
    const releaseUrl = './modal-bootstrap.js?v=20261030-v322';
    assert.ok(entry.includes(releaseUrl), 'runtime bootstrap must use the release-token URL');
    for (const name of [
        'app-core.js',
        'app-lifecycle-service.js',
        'language-engine.js',
        'notification-service.js',
        'modal.js'
    ]) {
        assert.ok(read(name).includes(releaseUrl), `${name} must import the same modal module URL`);
    }
});
