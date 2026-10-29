/** [AI-GENERATED][QA][V312] Regression tests for app sharing across web and Capacitor. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

test('share action remains connected to the existing settings menu contract', () => {
  assert.match(html, /data-action="bagikanAplikasi"/);
  assert.match(source, /window\.bagikanAplikasi\s*=\s*bagikanAplikasi/);
});

test('share flow supports native Capacitor Share and browser Web Share without user-agent gating', () => {
  assert.match(source, /NativeCapacitorService\.getPlugin\('Share'\)/);
  assert.match(source, /typeof navigator\.share === 'function'/);
  assert.doesNotMatch(source, /navigator\.share\s*&&\s*\/Android\|iPhone\|iPad\|iPod/);
});

test('share flow has clipboard and manual prompt fallbacks and a public URL on native platforms', () => {
  assert.match(source, /https:\/\/timer-proofer\.vercel\.app\//);
  assert.match(source, /navigator\.clipboard\.writeText\(textToCopy\)/);
  assert.match(source, /window\.prompt\('Salin teks dan tautan aplikasi berikut:'/);
});
