import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modalSource = readFileSync(resolve(root, 'assets/js/modal.js'), 'utf8');
const appCoreSource = readFileSync(resolve(root, 'assets/js/app-core.js'), 'utf8');
const photoServiceSource = readFileSync(resolve(root, 'assets/js/recipe-photo-service.js'), 'utf8');

test('global recipe photo preview is detached from hidden profile modal', () => {
  assert.match(modalSource, /function ensureRecipePhotoPreviewAtBody\(\)/);
  assert.match(modalSource, /document\.body\.appendChild\(previewModal\)/);
  assert.match(modalSource, /ensureRecipePhotoPreviewAtBody\(\);\s*bindPreviewBackdrop\(\)/);
  assert.match(modalSource, /const previewModal = ensureRecipePhotoPreviewAtBody\(\)/);
});

test('recipe method tabs use block layout so ingredient panel does not become a flex container', () => {
  assert.match(appCoreSource, /if \(selectedContent\) selectedContent\.style\.display = 'block';/);
  assert.doesNotMatch(appCoreSource, /if \(selectedContent\) selectedContent\.style\.display = 'flex';/);
});

test('uploaded recipe photo slots route existing images to preview instead of reopening upload', () => {
  assert.match(photoServiceSource, /if \(loaded && existingUrl\)[\s\S]*?window\.previewRecipePhoto\?\.\(event, existingUrl\)/);
});
