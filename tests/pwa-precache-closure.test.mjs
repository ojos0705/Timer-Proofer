/** [AI-GENERATED][QA][V256] Keep the actual ES-module runtime entry graph available offline. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(root, 'www');
const swSource = fs.readFileSync(path.join(webRoot, 'sw.js'), 'utf8');
const assetsBlock = swSource.match(/const ASSETS\s*=\s*\[([\s\S]*?)\];/);
assert.ok(assetsBlock, 'Service Worker must expose its precache ASSETS list.');
const precached = new Set([...assetsBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) =>
    path.resolve(webRoot, match[1])
));
const relativeImportPattern = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"](\.\.?\/[^'"]+)['"]/g;

function collectBootGraph() {
    const pending = [path.join(webRoot, 'assets/js/runtime-entry.js')];
    const visited = new Set();
    const missing = [];
    while (pending.length) {
        const current = pending.pop();
        if (visited.has(current)) continue;
        visited.add(current);
        assert.ok(fs.existsSync(current), `Imported module must exist: ${path.relative(root, current)}`);
        const source = fs.readFileSync(current, 'utf8');
        for (const match of source.matchAll(relativeImportPattern)) {
            // Strip cache-busting query from the local physical module path.
            const specifier = match[1].split(/[?#]/, 1)[0];
            const dependency = path.resolve(path.dirname(current), specifier);
            if (!dependency.startsWith(root + path.sep)) continue;
            if (!fs.existsSync(dependency) || !fs.statSync(dependency).isFile()) continue;
            if (!precached.has(dependency)) missing.push(path.relative(root, dependency));
            if (/\.(?:js|mjs)$/i.test(dependency)) pending.push(dependency);
        }
    }
    return { visited, missing };
}

test('every local JS module used by the runtime entrypoint is precached for first offline launch', () => {
    const { visited, missing } = collectBootGraph();
    assert.ok(visited.size >= 30, `Expected a substantial boot graph, got ${visited.size}`);
    assert.deepEqual([...new Set(missing)].sort(), []);
});

test('serialized notification queue is part of install-time precache', () => {
    const queueModule = path.resolve(webRoot, 'assets/js/serialized-operation-queue.js');
    assert.ok(precached.has(queueModule), 'Notification scheduler queue must be available offline.');
});

test('every local path declared in the Service Worker precache exists in the release package', () => {
    const entries = [...assetsBlock[1].matchAll(/['\"]([^'\"]+)['\"]/g)].map((match) => match[1]);
    const missing = entries.filter((entry) => !/^(?:https?:|data:)/i.test(entry) && !fs.existsSync(path.resolve(webRoot, entry)));
    assert.deepEqual(missing, []);
});
