/** [AI-GENERATED][QA][V338] Ensure Android sharesheet receives rich link-preview metadata. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const plugin = read('android/app/src/main/java/com/timerproofer/app/SharePreviewPlugin.java');
const activity = read('android/app/src/main/java/com/timerproofer/app/MainActivity.java');
const service = read('assets/js/native-capacitor-service.js');
const appCore = read('assets/js/app-core.js');

test('Android rich share plugin sends URL text and Sharesheet preview title', () => {
  assert.match(plugin, /@CapacitorPlugin\(name = "SharePreview"\)/);
  assert.match(plugin, /sendIntent\.putExtra\(Intent\.EXTRA_TEXT, shareText\)/);
  assert.match(plugin, /sendIntent\.putExtra\(Intent\.EXTRA_TITLE, previewTitle\)/);
  assert.match(plugin, /sendIntent\.putExtra\(Intent\.EXTRA_SUBJECT, previewTitle\)/);
  assert.match(plugin, /Intent\.createChooser\(sendIntent, chooserTitle\)/);
});

test('native Android rich share plugin is registered by the existing Activity', () => {
  assert.match(activity, /registerPlugin\(SharePreviewPlugin\.class\)/);
  assert.match(service, /'SharePreview'/);
  assert.match(service, /function isAndroidPlatform\(\)/);
  assert.match(service, /isAndroidPlatform,/);
});

test('Android invitation share and URL-only share prefer rich preview with safe plugin fallback', () => {
  assert.equal((appCore.match(/getPlugin\('SharePreview'\)/g) || []).length, 2);
  assert.equal((appCore.match(/getPlugin\('Share'\)/g) || []).length >= 2, true);
  assert.match(appCore, /NativeCapacitorService\.isAndroidPlatform\(\)[\s\S]*?getPlugin\('SharePreview'\)/);
  assert.match(appCore, /navigator\.share\(linkOnlyData\)/);
});
