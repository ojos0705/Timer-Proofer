import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('www/index.html');
const version = JSON.parse(read('version.json'));
const settingsStart = html.indexOf('<div class="page-modal" id="settings-modal">');
const settingsEnd = html.indexOf('<!-- MODAL KONEKSI BLUETOOTH -->', settingsStart);
assert.notEqual(settingsStart, -1, 'settings modal exists');
assert.notEqual(settingsEnd, -1, 'settings modal boundary exists');
const settings = html.slice(settingsStart, settingsEnd);

 test('all 11 Settings rows declare exactly the same Golden Ratio type scale', () => {
  assert.equal((settings.match(/<div data-action=/g) ?? []).length, 11);
  const primaryStyle = 'font-size: 1rem; font-weight: 600; line-height: 1.2; color: #3e2723;';
  const secondaryStyle = 'font-size: 0.618rem; font-weight: 400; line-height: 1.35; color: #888;';
  assert.equal((settings.match(new RegExp(primaryStyle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length, 11);
  assert.equal((settings.match(new RegExp(secondaryStyle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length, 11);
  assert.match(html, /--settings-type-primary:\s*1rem/);
  assert.match(html, /--settings-type-secondary:\s*calc\(var\(--settings-type-primary\)\s*\/\s*var\(--phi\)\)/);
  assert.match(settings, /data-action="handleRestartTourFromSettings"[\s\S]*?font-size: 1rem; font-weight: 600; line-height: 1\.2; color: #3e2723;">Tour Aplikasi/);
  assert.match(settings, /data-action="handleRestartTourFromSettings"[\s\S]*?font-size: 0\.618rem; font-weight: 400; line-height: 1\.35; color: #888;">Ulangi panduan/);
  assert.ok(Math.abs((1 / 0.618) - 1.618) < 0.001, 'primary and secondary sizes preserve phi ≈ 1.618');
});

test('settings typography release metadata is synchronized to V340', () => {
  assert.equal(version.version, 'V125');
  assert.equal(version.build, 'es6-modular-v342');
  assert.equal(version.serviceWorker, 'Timer-Proofing-v1.1.244');
  assert.equal(version.releaseToken, '20261102-v342');
  assert.match(html, /runtime-entry\.js\?v=20261102-v342/);
});
