import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const core = readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../www/sw.js', import.meta.url), 'utf8');

test('recipe detail has a visible, accessible top-right close control wired to the existing close handler', () => {
  assert.match(html, /<div id="recipe-detail-view"[^>]*>/);
  assert.match(html, /<button id="btn-recipe-close-top"[^>]*data-action="tutupHalamanResepSecaraAman"[^>]*aria-label="Tutup detail resep"[^>]*>×<\/button>/);
  assert.match(core, /window\.tutupHalamanResepSecaraAman = tutupHalamanResepSecaraAman/);
  assert.doesNotMatch(core, /btnRecipeCloseTop\.addEventListener/);
});

test('recipe detail header adapts to narrow viewports and safe areas without changing existing selectors', () => {
  assert.match(html, /#recipe-detail-view > \.article-modal-header/);
  assert.match(html, /@media \(max-width: 520px\)/);
  assert.match(html, /env\(safe-area-inset-top\)/);
  assert.match(html, /#recipe-detail-view \.recipe-detail-header-actions/);
});

test('recipe overlay paints above the top navigation so its header and close control are not covered', () => {
  assert.match(html, /#recipe\.recipe-modal\s*\{[\s\S]*?z-index:\s*1200;/);
  assert.match(html, /z-index: var\(--z-navbar, 1000\)/);
});

test('V312 refreshes the runtime module URL and Service Worker cache', () => {
  assert.match(html, /runtime-entry\.js\?v=20261030-v322/);
  assert.match(sw, /Timer-Proofing-v1\.1\.224/);
});
