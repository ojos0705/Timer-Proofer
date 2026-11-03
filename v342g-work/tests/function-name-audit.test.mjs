/** [AI-GENERATED][QA][V289] Verify duplicate-function audit respects ES module scope. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { auditFunctionNames } from '../scripts/audit-function-names.mjs';

test('same function name in separate ES modules is informational, not a collision', () => {
    const result = auditFunctionNames([
        { file: 'a.js', source: 'function init() {}' },
        { file: 'b.js', source: 'function init() {}' }
    ]);
    assert.equal(result.duplicatesWithinModule.length, 0);
    assert.equal(result.acrossModules.length, 1);
    assert.equal(result.acrossModules[0].name, 'init');
});

test('duplicate function declarations within one module are detected with line numbers', () => {
    const result = auditFunctionNames([
        { file: 'broken.js', source: 'function save() {}\n\nasync function save() {}' }
    ]);
    assert.equal(result.duplicatesWithinModule.length, 1);
    assert.equal(result.duplicatesWithinModule[0].first.line, 1);
    assert.equal(result.duplicatesWithinModule[0].duplicate.line, 2);
});
