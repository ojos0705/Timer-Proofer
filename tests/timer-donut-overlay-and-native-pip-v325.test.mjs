/** [AI-GENERATED][QA][V325] Timer startup, donut guide, overlay, scroll recovery and Android PiP. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = fs.readFileSync(path.join(root, 'assets/js/app-core.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
const nativeService = fs.readFileSync(path.join(root, 'assets/js/native-capacitor-service.js'), 'utf8');
const lifecycle = fs.readFileSync(path.join(root, 'assets/js/app-lifecycle-service.js'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
const mainActivity = fs.readFileSync(path.join(root, 'android/app/src/main/java/com/timerproofer/app/MainActivity.java'), 'utf8');
const pipPlugin = fs.readFileSync(path.join(root, 'android/app/src/main/java/com/timerproofer/app/TimerPipPlugin.java'), 'utf8');

function section(source, start, end) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from + start.length);
    assert.ok(from >= 0, `Missing start marker: ${start}`);
    assert.ok(to > from, `Missing end marker: ${end}`);
    return source.slice(from, to);
}

test('donut instruction map uses the canonical alias target and includes steps', () => {
    const recipeMap = section(core, 'const resepProduk = {', '// Fungsi untuk memperbarui daftar cara pembuatan');
    assert.match(recipeMap, /donut:\s*\[/);
    assert.doesNotMatch(recipeMap, /\bdonat:\s*\[/);
    assert.match(core, /getRecipeInstructionSteps\(resepProduk, productKey\)/);
});

test('recipe guide opens as an absolute overlay over the timer circle', () => {
    assert.match(core, /caraPembuatanWrapper\.classList\.add\('overlay-open'\)/);
    assert.match(core, /--cara-overlay-top/);
    assert.match(html, /\.cara-pembuatan-wrapper\.overlay-open\s*\{[\s\S]*?position:\s*absolute/);
    assert.match(html, /\.proofer-selector-wrapper\s*\{[\s\S]*?position:\s*relative/);
});

test('timer controls bind when app-core loads after DOMContentLoaded', () => {
    const bindings = section(core, 'function initProofingControlBindings()', '/**\n * =========================================================================\n * INISIALISASI UTAMA APLIKASI');
    assert.match(bindings, /document\.readyState === 'loading'/);
    assert.match(bindings, /initProofingControlBindings\(\)/);
    assert.match(bindings, /bindReplaceableClick\(startButton/);
    assert.match(bindings, /bindReplaceableClick\(setButton/);
    assert.match(bindings, /customInput\.addEventListener\('keydown'/);
    assert.doesNotMatch(core, /btnStartProofing\.addEventListener\('click', async/);
});

test('START starts synchronously and does not block on notification permission', () => {
    const bindings = section(core, 'function initProofingControlBindings()', '/**\n * =========================================================================\n * INISIALISASI UTAMA APLIKASI');
    const startHandler = section(bindings, "if (startButton && startButton.dataset.tpProofingStartBound", "    proofingControlsInitialized =");
    assert.match(startHandler, /triggerMainProofing\(\)/);
    assert.doesNotMatch(startHandler, /await\s+requestNotificationPermission/);
    assert.match(core, /ProofingNotificationService\.scheduleSeconds\(sisaDetik/);
});

test('custom time validates 1–120 minutes and persists the selected duration', () => {
    const setter = section(core, 'function setCustomTime()', '/** Alias & fungsi pendukung');
    assert.match(setter, /customVal < 1 \|\| customVal > 120/);
    assert.match(setter, /globalTotalSeconds = customVal \* 60/);
    assert.match(setter, /persistProofingState\(\)/);
});

test('scroll area is the only vertical scroller inside a fixed-height app shell', () => {
    assert.match(html, /#app-container\s*\{[\s\S]*?height:\s*100dvh[\s\S]*?overflow:\s*hidden/);
    assert.match(html, /#app-container\s*>\s*\.scrollable-content\s*\{[\s\S]*?height:\s*0[\s\S]*?overflow-y:\s*auto[\s\S]*?touch-action:\s*pan-y/);
    assert.match(html, /overscroll-behavior-y:\s*contain/);
});

test('Capacitor native bridge registers TimerPip and Android activity supports PiP', () => {
    assert.match(nativeService, /'TimerPip'/);
    assert.match(mainActivity, /registerPlugin\(TimerPipPlugin\.class\)/);
    assert.match(manifest, /android:supportsPictureInPicture="true"/);
    assert.match(manifest, /android:resizeableActivity="true"/);
    assert.match(pipPlugin, /@CapacitorPlugin\(name = "TimerPip"\)/);
    assert.match(pipPlugin, /activity\.enterPictureInPictureMode\(builder\.build\(\)\)/);
    assert.match(pipPlugin, /getState\(PluginCall call\)/);
});

test('hardware Back enters native PiP only while the proofing timer is running', () => {
    const lifecycleConfig = section(core, 'initializeAppLifecycle({', "// [AI-GENERATED][ROBUSTNESS][V137]");
    assert.match(lifecycleConfig, /onBackButton:\s*async\s*\(source\s*=\s*'native-back'\)\s*=>/);
    assert.match(lifecycleConfig, /isTimerRunning\s*&&\s*proofingTimerController\.isRunning\(\)/);
    assert.match(lifecycleConfig, /NativeCapacitorService\.getPlugin\('TimerPip'\)/);
    assert.match(lifecycleConfig, /pipPlugin\.enterPictureInPicture\(\)/);
    assert.match(lifecycle, /lifecycleCallbacks\.onBackButton/);
});


test('Android PiP exit callback restores the normal WebView layout even without appState change', () => {
    assert.match(mainActivity, /onPictureInPictureModeChanged\(boolean isInPictureInPictureMode, Configuration newConfig\)/);
    assert.match(mainActivity, /timerproofer:pipchange/);
    assert.match(core, /addEventListener\('timerproofer:pipchange'/);
    assert.match(core, /classList\.toggle\('native-pip', isInPictureInPictureMode\)/);
});
