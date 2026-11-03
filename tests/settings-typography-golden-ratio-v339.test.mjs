import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
const version = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
const settingsStart = html.indexOf('<div class="page-modal" id="settings-modal">');
const settingsEnd = html.indexOf('<!-- MODAL KONEKSI BLUETOOTH -->', settingsStart);
assert.notEqual(settingsStart, -1, 'settings modal exists');
assert.notEqual(settingsEnd, -1, 'settings modal boundary exists');
const settings = html.slice(settingsStart, settingsEnd);

test('all Settings menu rows share one Golden Ratio typography scale', () => {
  assert.match(html, /#settings-modal\s*\{[^}]*--settings-type-primary:\s*1rem;[^}]*--settings-type-secondary:\s*calc\(var\(--settings-type-primary\)\s*\/\s*var\(--phi\)\)/s);
  assert.match(html, /#settings-modal\s+\.modal-scroll-content\s*>\s*div\[data-action\]\s*>\s*div:first-child\s*>\s*div\s*>\s*div:first-child\s*\{[^}]*font-size:\s*var\(--settings-type-primary\)\s*!important/s);
  assert.match(html, /#settings-modal\s+\.modal-scroll-content\s*>\s*div\[data-action\]\s*>\s*div:first-child\s*>\s*div\s*>\s*div:nth-child\(2\)\s*\{[^}]*font-size:\s*var\(--settings-type-secondary\)\s*!important/s);

  assert.equal((settings.match(/<div data-action=/g) ?? []).length, 11, 'all eleven settings rows share the normalized selector');
  assert.equal((settings.match(/>Tour Aplikasi<\/div>/g) ?? []).length, 1);
  assert.match(settings, /data-action="handleRestartTourFromSettings"[\s\S]*?>Tour Aplikasi<\/div>/);
  assert.doesNotMatch(settings, /font-size:\s*14px|font-size:\s*12px|font-size:\s*18px/,
    'the Tour row must not keep its one-off 14/12/18px typography');
  assert.match(html, /#settings-modal \.modal-scroll-content > div\[data-action\] > div:first-child > div > div:first-child/);
});

test('settings typography release metadata is synchronized to V339', () => {
  assert.equal(version.version, 'V125');
  assert.equal(version.build, 'es6-modular-v339');
  assert.equal(version.serviceWorker, 'Timer-Proofing-v1.1.241');
  assert.equal(version.releaseToken, '20261101-v339');
  assert.match(html, /runtime-entry\.js\?v=20261101-v339/);
});
