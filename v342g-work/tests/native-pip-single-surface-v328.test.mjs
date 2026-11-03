/** [AI-GENERATED][QA][V328] Native Capacitor uses only Activity-level PiP. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const core = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const manifest = fs.readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
const nativeService = fs.readFileSync(new URL('../assets/js/native-capacitor-service.js', import.meta.url), 'utf8');

function section(source, start, end) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from + start.length);
    assert.ok(from >= 0, `Missing start marker: ${start}`);
    assert.ok(to > from, `Missing end marker: ${end}`);
    return source.slice(from, to);
}

test('native Android cannot open the browser video PiP surface', () => {
    const canUse = section(core, 'function canUseVideoPictureInPicture()', 'function drawWebVideoPipFrame');
    assert.match(canUse, /NativeCapacitorService\.isNativePlatform\(\)\) return false/);
});

test('native PiP branch runs before browser mini/video/document PiP branches', () => {
    const pip = section(core, 'async function aktifkanModePIP(options = {})', '// ==========================================\n// FUNGSI KALKULATOR HPP');
    const nativeIndex = pip.indexOf('if (NativeCapacitorService.isNativePlatform())');
    const browserVideoIndex = pip.indexOf('enterWebVideoPictureInPicture()');
    const documentIndex = pip.indexOf("'documentPictureInPicture' in window");
    assert.ok(nativeIndex >= 0 && browserVideoIndex > nativeIndex && documentIndex > nativeIndex);
    assert.match(pip, /nativePipPlugin\.enterPictureInPicture\(\)/);
});

test('native PiP branch closes browser PiP surfaces before entering Activity PiP', () => {
    const pip = section(core, 'async function aktifkanModePIP(options = {})', '// ==========================================\n// FUNGSI KALKULATOR HPP');
    const native = pip.slice(pip.indexOf('if (NativeCapacitorService.isNativePlatform())'), pip.indexOf('// If the user taps the PiP control'));
    assert.match(native, /document\.exitPictureInPicture\(\)/);
    assert.match(native, /webVideoPipState\.cleanup\(\)/);
    assert.match(native, /pipWindowInstance\.close\(\)/);
});

test('Capacitor plugin capability remains explicitly native-gated', () => {
    assert.match(nativeService, /if \(!capacitor \|\| !isNativePlatform\(\)\) return null/);
    assert.match(manifest, /android:supportsPictureInPicture="true"/);
    assert.match(manifest, /android:launchMode="singleTask"/);
});
