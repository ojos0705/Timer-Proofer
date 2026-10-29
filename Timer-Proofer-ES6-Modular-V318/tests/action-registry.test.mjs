/** [AI-GENERATED][QA][V220] Regression tests for own-property action resolution. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getOwnCallable } from '../assets/js/core/action-registry.js';

const dispatcherSource = fs.readFileSync(new URL('../assets/js/core/event-delegation.js', import.meta.url), 'utf8');

test('action registry resolves an explicitly owned callable entry', () => {
    const handler = () => 'ok';
    assert.equal(getOwnCallable({ save: handler }, 'save'), handler);
});

test('action registry rejects inherited callable properties such as toString and constructor', () => {
    const inherited = Object.create({ toString() { return 'not an action'; } });
    assert.equal(getOwnCallable(inherited, 'toString'), null);
    assert.equal(getOwnCallable(inherited, 'constructor'), null);
    assert.equal(getOwnCallable({}, 'toString'), null);
});

test('action registry rejects invalid containers, names, and non-callable own properties', () => {
    assert.equal(getOwnCallable(null, 'save'), null);
    assert.equal(getOwnCallable(undefined, 'save'), null);
    assert.equal(getOwnCallable({ save: true }, 'save'), null);
    assert.equal(getOwnCallable({ save() {} }, ''), null);
    assert.equal(getOwnCallable({ save() {} }, 1), null);
});

test('delegated click and legacy-call resolution both use the own-property guard', () => {
    assert.match(dispatcherSource, /getOwnCallable\(SPECIAL_ACTIONS, name\) \|\| getOwnCallable\(window, name\)/);
    assert.match(dispatcherSource, /const fn = getOwnCallable\(window, match\[1\]\)/);
    assert.match(dispatcherSource, /const fn = getOwnCallable\(window, guardedCall\[1\]\)/);
    assert.doesNotMatch(dispatcherSource, /const fn = window\[(?:match|guardedCall)\[1\]\]/);
});
