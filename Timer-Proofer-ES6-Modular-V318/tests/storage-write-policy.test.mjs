/** [AI-GENERATED][QA][V229] Native mirrored-write and stable-flush regressions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storageSource = fs.readFileSync(path.join(root, 'assets/js/storage-service.js'), 'utf8');
const proofingSource = fs.readFileSync(path.join(root, 'assets/js/proofing-service.js'), 'utf8');
const swSource = fs.readFileSync(path.join(root, 'www/sw.js'), 'utf8');
const flushSource = fs.readFileSync(path.join(root, 'assets/js/storage-flush.js'), 'utf8');

test('StorageService setString uses the all-active-backends write result policy', () => {
    assert.match(storageSource, /isPersistenceWriteComplete\(/);
    assert.match(storageSource, /nativeWriteRequired\s*=\s*Boolean\(preferences\)/);
    assert.doesNotMatch(storageSource, /return\s+localSaved\s*\|\|\s*nativeSaved\s*;/);
});

test('persistence failures stay marked until a successful mutation clears the marker', () => {
    assert.match(storageSource, /const failedPersistenceKeys = new Set\(\)/);
    assert.match(storageSource, /failedPersistenceKeys\.add\(key\)/);
    assert.match(storageSource, /failedPersistenceKeys\.delete\(key\)/);
});

test('StorageService flush reports a rejected pending key write as failure', () => {
    assert.match(storageSource, /async function flush\(key\)/);
    assert.match(flushSource, /catch\s*\{\s*return false;/);
    assert.match(flushSource, /return !hasFailed\(key\)/);
});

test('ProofingService propagates StorageService flush failure to lifecycle caller', () => {
    assert.match(proofingSource, /queuedWritesPersisted\s*===\s*false\)\s*statePersisted\s*=\s*false/);
    assert.match(proofingSource, /FLUSH state proofing gagal/);
});

test('new mirrored-write policy remains in the boot graph through the existing shared helper', () => {
    assert.match(storageSource, /from '\.\/storage-clear-result\.js'/);
    assert.match(swSource, /\.\/assets\/js\/storage-clear-result\.js/);
});

test('StorageService delegates flush to the stable-queue helper', () => {
    assert.match(storageSource, /flushPersistenceQueueUntilStable\(/);
    assert.match(flushSource, /getPendingWrite\(key\) !== pendingAtStart/);
    assert.match(flushSource, /getResetBarrier\(\) !== barrierAtStart/);
});

test('stable-queue helper is precached for offline lifecycle flushes', () => {
    assert.match(swSource, /\.\/assets\/js\/storage-flush\.js/);
});
