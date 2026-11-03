/** [AI-GENERATED][QA][V338] Keep an explicit URL-only share path beside the invitation share. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

test('share panel exposes separate invitation, URL-only share, and copy actions', () => {
  assert.match(html, /id="btn-share-app-native"[^>]*data-action="shareAppNow"/);
  assert.match(html, /id="btn-share-app-link"[^>]*data-action="shareAppLinkOnly"/);
  assert.match(html, /Bagikan tautan saja/);
  assert.match(html, /id="btn-copy-app-link"[^>]*data-action="copyAppShareLink"/);
});

test('URL-only action passes only title and URL to rich Android Sharesheet bridge', () => {
  const match = appCore.match(/async function shareAppLinkOnly\(\)\s*\{([\s\S]*?)\n\}\n\nasync function copyAppShareLink/);
  assert.ok(match, 'shareAppLinkOnly implementation must exist');
  const body = match[1];
  assert.match(body, /NativeCapacitorService\.isNativePlatform\(\)/);
  assert.match(body, /NativeCapacitorService\.isAndroidPlatform\(\)[\s\S]*?getPlugin\('SharePreview'\)/);
  assert.match(body, /richNativeShare\.share\(\{\s*title,\s*url,\s*dialogTitle: 'Bagikan tautan Timer Proofer'/);
  assert.match(body, /getPlugin\('Share'\)/);
  assert.doesNotMatch(body, /nativeShare\.share\(\{[^}]*\btext\s*:/s);
});

test('URL-only action uses Web Share API in PWA and retains a copy fallback', () => {
  const match = appCore.match(/async function shareAppLinkOnly\(\)\s*\{([\s\S]*?)\n\}\n\nasync function copyAppShareLink/);
  assert.ok(match);
  const body = match[1];
  assert.match(body, /navigator\.share\(linkOnlyData\)/);
  assert.match(body, /return await copyAppShareLink\(\)/);
  assert.match(appCore, /window\.shareAppLinkOnly\s*=\s*shareAppLinkOnly/);
});
