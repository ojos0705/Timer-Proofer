/** [AI-GENERATED][QA][V222] Full-storage-clear result regressions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isPersistenceClearComplete, isPersistenceRemoveComplete, isPersistenceWriteComplete } from '../assets/js/storage-clear-result.js';

test('browser cleanup succeeds when local storage is cleared and no native backend is required', () => {
    assert.equal(isPersistenceClearComplete({ localCleared: true }), true);
});

test('native cleanup succeeds only when both local and native backends confirm clear', () => {
    assert.equal(isPersistenceClearComplete({ localCleared: true, nativeClearRequired: true, nativeCleared: true }), true);
});

test('native clear failure is not hidden by a successful local clear', () => {
    assert.equal(isPersistenceClearComplete({ localCleared: true, nativeClearRequired: true, nativeCleared: false }), false);
});

test('local clear failure is not hidden by a successful native clear', () => {
    assert.equal(isPersistenceClearComplete({ localCleared: false, nativeClearRequired: true, nativeCleared: true }), false);
});

test('a detected native backend without a usable clear method cannot report complete cleanup', () => {
    assert.equal(isPersistenceClearComplete({ localCleared: true, nativeClearRequired: true, nativeCleared: false }), false);
});

test('a failed local clear cannot report complete browser cleanup', () => {
    assert.equal(isPersistenceClearComplete({ localCleared: false, nativeClearRequired: false, nativeCleared: false }), false);
});


test('browser key removal succeeds after local storage confirms the removal', () => {
    assert.equal(isPersistenceRemoveComplete({ localRemoved: true }), true);
});

test('native key removal requires both local and Preferences confirmation', () => {
    assert.equal(isPersistenceRemoveComplete({ localRemoved: true, nativeRemoveRequired: true, nativeRemoved: true }), true);
    assert.equal(isPersistenceRemoveComplete({ localRemoved: true, nativeRemoveRequired: true, nativeRemoved: false }), false);
});

test('failed local removal cannot be masked by native success', () => {
    assert.equal(isPersistenceRemoveComplete({ localRemoved: false, nativeRemoveRequired: true, nativeRemoved: true }), false);
});

test('missing native remove capability is not reported as complete cleanup', () => {
    assert.equal(isPersistenceRemoveComplete({ localRemoved: true, nativeRemoveRequired: true, nativeRemoved: false }), false);
});

test('missing or invalid storage keys fail closed', () => {
    assert.equal(isPersistenceRemoveComplete({}), false);
    assert.equal(isPersistenceRemoveComplete({ localRemoved: true, nativeRemoveRequired: false, nativeRemoved: false }), true);
});


test('browser persistence writes require LocalStorage confirmation', () => {
    assert.equal(isPersistenceWriteComplete({ localSaved: true }), true);
    assert.equal(isPersistenceWriteComplete({ localSaved: false }), false);
});

test('native persistence writes require both LocalStorage and Preferences confirmation', () => {
    assert.equal(isPersistenceWriteComplete({ localSaved: true, nativeWriteRequired: true, nativeSaved: true }), true);
    assert.equal(isPersistenceWriteComplete({ localSaved: true, nativeWriteRequired: true, nativeSaved: false }), false);
    assert.equal(isPersistenceWriteComplete({ localSaved: false, nativeWriteRequired: true, nativeSaved: true }), false);
});

test('missing or invalid write results fail closed', () => {
    assert.equal(isPersistenceWriteComplete({}), false);
    assert.equal(isPersistenceWriteComplete({ localSaved: true, nativeWriteRequired: true }), false);
});
