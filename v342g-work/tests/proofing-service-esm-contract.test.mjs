/** [AI-GENERATED][QA][V270] Proofing persistence is consumed as ESM, not a mutable window global. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const proofingSource = fs.readFileSync(new URL('../assets/js/proofing-service.js', import.meta.url), 'utf8');
const appCoreSource = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');

test('ProofingService exposes the frozen named ESM export without publishing a window alias', () => {
    assert.match(proofingSource, /export const ProofingService = Object\.freeze\(/);
    assert.doesNotMatch(proofingSource, /window\.ProofingService\s*=/);
    assert.match(appCoreSource, /import\s+\{\s*ProofingService\s*\}\s+from\s+["']\.\/proofing-service\.js["']/);
});

test('app-core uses the required ProofingService ESM binding directly for cleanup and lifecycle flush', () => {
    assert.match(appCoreSource, /key === 'proofing_logs'\s*\?\s*ProofingService\.clearLogs\(\)/);
    const start = appCoreSource.indexOf('async function flushBackgroundPersistence()');
    const end = appCoreSource.indexOf('\n\n// [AI-GENERATED][ROBUSTNESS][V235]', start);
    assert.ok(start >= 0 && end > start, 'flushBackgroundPersistence must remain isolated');
    const helper = appCoreSource.slice(start, end);
    assert.match(helper, /await ProofingService\.flushPersistence\(\)/);
    assert.doesNotMatch(helper, /typeof ProofingService|window\.ProofingService/);
});
