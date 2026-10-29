import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../assets/js/modal-bootstrap.js', import.meta.url), 'utf8');

test('V310 detaches every independent overlay nested inside the profile container', () => {
  assert.match(source, /function detachOverlaysFromProfileContainer\(\)/);
  assert.match(source, /profileModal\.querySelectorAll\?\.\([\s\S]*?\.page-modal[\s\S]*?#modal-preview-foto/);
  assert.match(source, /document\.body\.appendChild\(overlay\)/);
  assert.match(source, /detachOverlaysFromProfileContainer\(\);/);
  assert.doesNotMatch(source, /function detachNavigationModalsFromHiddenProfile\(\)/);
});

test('V310 keeps profile-only data loading tied to the profile modal', () => {
  assert.match(source, /if \(modal\.id === 'user-modal'\) \{[\s\S]*?window\.loadDynamicProfile\?\.\(false\)/);
});
