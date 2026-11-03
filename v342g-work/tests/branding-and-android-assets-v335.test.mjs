/** [AI-GENERATED][QA][V335] Verify Android launcher assets are derived from the PWA brand mark. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative));
const pngSize = (buffer) => ({ width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) });
const manifest = JSON.parse(read('www/manifest.json').toString('utf8'));

test('PWA manifest provides installable any and maskable PNG icons', () => {
  const bySize = new Map(manifest.icons.map((icon) => [icon.sizes, icon]));
  for (const size of ['192x192', '512x512']) {
    assert.ok(bySize.has(size), `manifest missing ${size}`);
    const icon = bySize.get(size);
    const image = read(`www/${icon.src}`);
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.deepEqual(pngSize(image), {
      width: Number(size.split('x')[0]),
      height: Number(size.split('x')[1])
    });
  }
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
});

test('Android launcher, adaptive foreground/background and splash assets use the PWA donut palette', () => {
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, dimension] of Object.entries(densities)) {
    const icon = read(`android/app/src/main/res/mipmap-${density}/ic_launcher.png`);
    const round = read(`android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`);
    const foreground = read(`android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`);
    for (const image of [icon, round, foreground]) {
      assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.deepEqual(pngSize(image), { width: dimension, height: dimension });
    }
  }
  const background = read('android/app/src/main/res/values/ic_launcher_background.xml').toString('utf8');
  const foreground = read('android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml').toString('utf8');
  const manifestAndroid = read('android/app/src/main/AndroidManifest.xml').toString('utf8');
  assert.match(background, /#FDF5E6/i);
  assert.match(foreground, /#E67E22/i);
  assert.match(foreground, /#4E342E/i);
  assert.match(manifestAndroid, /android:icon="@mipmap\/ic_launcher"/);
  const splashFiles = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'splash.png') splashFiles.push(full);
    }
  };
  walk(path.join(root, 'android/app/src/main/res'));
  assert.ok(splashFiles.length >= 10, 'expected density-specific and orientation-specific splash images');
  for (const file of splashFiles) {
    const image = fs.readFileSync(file);
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});
