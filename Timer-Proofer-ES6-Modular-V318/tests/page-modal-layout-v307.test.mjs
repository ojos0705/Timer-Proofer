import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

test('page modal scroll region can shrink and scroll without pushing bottom actions out of view', () => {
  assert.match(html, /\.page-modal\s*\{[\s\S]*?height:\s*100dvh;/);
  assert.match(html, /\.page-modal\s*\{[\s\S]*?overflow:\s*hidden;/);
  assert.match(html, /\.modal-scroll-content\s*\{[\s\S]*?min-height:\s*0;/);
  assert.match(html, /\.modal-scroll-content\s*\{[\s\S]*?overflow-y:\s*auto;/);
  assert.match(html, /\.page-modal\s*>\s*\.modal-bottom-actions\s*\{\s*flex:\s*0\s+0\s+auto;/);
});

test('settings modal keeps its existing IDs and menu action targets', () => {
  assert.match(html, /id="settings-modal"/);
  assert.match(html, /id="btn-close-setting"[^>]*data-action="toggleModal"[^>]*data-arg="settings-modal"/);
  assert.match(html, /data-action="PreferensiModal"/);
  assert.match(html, /data-action="openBackupModal"/);
});
