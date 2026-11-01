import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readJson = (path) => JSON.parse(fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Capacitor Share is an explicit Capacitor 8 runtime dependency', () => {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  assert.equal(pkg.dependencies['@capacitor/share'], '^8.0.2');
  assert.equal(lock.packages[''].dependencies['@capacitor/share'], '^8.0.2');
  assert.equal(lock.packages['node_modules/@capacitor/share'].version, '8.0.2');
  assert.equal(lock.packages['node_modules/@capacitor/share'].peerDependencies['@capacitor/core'], '>=8.0.0');
});

test('Android generated plugin registry and Gradle include Capacitor Share', () => {
  const plugins = readJson('android/app/src/main/assets/capacitor.plugins.json');
  assert.ok(plugins.some((plugin) => plugin.pkg === '@capacitor/share' && plugin.classpath === 'com.capacitorjs.plugins.share.SharePlugin'));
  assert.match(read('android/capacitor.settings.gradle'), /include ':capacitor-share'/);
  assert.match(read('android/capacitor.settings.gradle'), /node_modules\/@capacitor\/share\/android/);
  assert.match(read('android/app/capacitor.build.gradle'), /implementation project\(':capacitor-share'\)/);
});

test('Existing share UI uses the native plugin inside Capacitor and Web Share in browser', () => {
  const appCore = read('assets/js/app-core.js');
  const bridge = read('assets/js/native-capacitor-service.js');
  assert.match(bridge, /Share,/);
  assert.match(appCore, /NativeCapacitorService\.getPlugin\('Share'\)/);
  assert.match(appCore, /dialogTitle: 'Bagikan Timer Proofer'/);
  assert.match(appCore, /typeof navigator\.share === 'function'/);
  assert.match(appCore, /copyAppShareLink/);
});
