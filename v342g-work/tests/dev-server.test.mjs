/** [AI-GENERATED][QA][V199] HTTP integration tests for the local static preview server. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { createStaticServer } from '../server.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function withServer(callback) {
    const server = createStaticServer({ root: path.join(projectRoot, 'www'), host: '127.0.0.1', port: 0 });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    const origin = `http://127.0.0.1:${address.port}`;
    try {
        await callback(origin);
    } finally {
        server.closeAllConnections?.();
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
}

test('local QA server serves the PWA entrypoint with an explicit HTML content type', async () => {
    await withServer(async (origin) => {
        const response = await fetch(`${origin}/`);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type') || '', /^text\/html; charset=utf-8/);
        assert.match(await response.text(), /Timer Proofer/);
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    });
});

test('local QA server serves the ES-module entrypoint and its auth feature modules', async () => {
    await withServer(async (origin) => {
        for (const resource of [
            '/assets/js/runtime-entry.js',
            '/assets/js/boot.js',
            '/assets/js/auth-service.js',
            '/assets/js/features-auth-ui.js',
            '/vendor/capacitor-plugins.js'
        ]) {
            const response = await fetch(`${origin}${resource}`);
            assert.equal(response.status, 200, `${resource} must be available from the production web root`);
            assert.match(response.headers.get('content-type') || '', /(?:javascript|ecmascript)/i, `${resource} must have a JavaScript MIME type`);
        }
    });
});

test('local QA server serves version metadata without a stale cache directive', async () => {
    await withServer(async (origin) => {
        const response = await fetch(`${origin}/version.json`);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type') || '', /^application\/json/);
        assert.equal(response.headers.get('cache-control'), 'no-cache');
        const servedVersion = (await response.json()).version;
        const releaseVersion = JSON.parse(fs.readFileSync(path.join(projectRoot, 'version.json'), 'utf8')).version;
        assert.equal(servedVersion, releaseVersion, 'QA server must serve the current release metadata');
    });
});

test('local QA server rejects traversal, malformed encoding, and hidden paths', async () => {
    await withServer(async (origin) => {
        const traversal = await fetch(`${origin}/%2e%2e%2fpackage.json`);
        assert.equal(traversal.status, 403);
        const malformed = await fetch(`${origin}/%E0%A4%A`);
        assert.equal(malformed.status, 400);
        const hidden = await fetch(`${origin}/.env`);
        assert.equal(hidden.status, 404);
        const source = await fetch(`${origin}/server.js`);
        assert.equal(source.status, 404);
        const manifest = await fetch(`${origin}/package.json`);
        assert.equal(manifest.status, 404);
        const apiSource = await fetch(`${origin}/api/ai-analyze.js`);
        assert.equal(apiSource.status, 404);
        const legacyPhp = await fetch(`${origin}/api_achievements.php`);
        assert.equal(legacyPhp.status, 404);
    });
});

test('local QA server supports HEAD and rejects unsupported methods', async () => {
    await withServer(async (origin) => {
        const head = await fetch(`${origin}/index.html`, { method: 'HEAD' });
        assert.equal(head.status, 200);
        assert.ok(Number(head.headers.get('content-length')) > 0);
        assert.equal(await head.text(), '');
        const options = await fetch(`${origin}/`, { method: 'OPTIONS' });
        assert.equal(options.status, 405);
        assert.equal(options.headers.get('allow'), 'GET, HEAD');
    });
});
