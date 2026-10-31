/** [AI-GENERATED][QA][V329] Stable telemetry output, recipe ownership, language retries and mobile assistant layout. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('AI Telemetry has a fixed seven-section contract while preserving product-specific profiles', () => {
    const backend = read('api/ai-telemetry.js');
    const core = read('assets/js/app-core.js');
    const requiredSections = [
        '📊 Kondisi Data Aktual',
        '🥯 Evaluasi Produk',
        '🌡️ Pengaruh Suhu dan Kelembapan',
        '⚠️ Risiko Proofing',
        '🛠️ Tindakan Praktis',
        '⏱️ Rentang Estimasi',
        '👀 Tanda Siap'
    ];
    let previousIndex = -1;
    for (const section of requiredSections) {
        const index = backend.indexOf(section);
        assert.ok(index > previousIndex, `section must exist in order: ${section}`);
        previousIndex = index;
        assert.ok(core.includes(section), `client prompt should include ${section}`);
    }
    for (const product of ['donat', 'roti', 'bakpao', 'pizza', 'salt_bread']) {
        assert.ok(core.includes(`${product}:`), `product profile missing: ${product}`);
    }
    assert.match(core, /#product-pills-container \.product-pill\.active\[data-product\]/);
    assert.match(core, /outputContract:\s*'telemetry-v1'/);
    assert.match(read('api/ai-utils.js'), /AI_BACKEND_REVISION\s*=\s*["']V329["']/);
});

test('Google Translate language flow waits for a real combo and does not mark an online failure as pending', () => {
    const engine = read('assets/js/language-engine.js');
    const list = read('assets/js/lang-data.js');
    assert.match(list, /\{\s*code:\s*'ab',\s*name:\s*'Abkhaz'/);
    assert.match(engine, /await loadGoogleTranslateWidget\(\{\s*timeoutMs:\s*15000\s*\}\)/);
    const onlineBlock = engine.slice(engine.indexOf('// D. Online: Google Translate'), engine.indexOf('} catch (error)', engine.indexOf('// D. Online: Google Translate')));
    assert.doesNotMatch(onlineBlock, /bahasaTunda\(/);
    assert.match(onlineBlock, /tutupModalBahasa\(\)/);
    assert.match(onlineBlock, /if \(!combo\)[\s\S]*Pilihan belum disimpan/);
});

test('AI recipe analysis is cleared on master navigation and stale recipe responses are rejected', () => {
    const core = read('assets/js/app-core.js');
    const masterBlock = core.slice(core.indexOf('function bukaMasterViewResep()'), core.indexOf('function kembaliKeMasterView()'));
    assert.match(masterBlock, /resetRecipeAiAnalysisState\(\)/);
    assert.match(core, /resultContainer\.dataset\.recipeOwner\s*=\s*''/);
    assert.match(core, /requestEpoch\s*===\s*recipeAiAnalysisRequestEpoch/);
    assert.match(core, /currentEditingRecipeId[\s\S]*requestRecipeId/);
    assert.match(core, /resultContainer\.dataset\.recipeOwner\s*=\s*requestRecipeId/);
});

test('AI assistant loading state remains inside the card on narrow screens', () => {
    const html = read('www/index.html');
    const core = read('assets/js/app-core.js');
    assert.match(html, /\.ai-assistant-card #ai-tips-btn[\s\S]*white-space:\s*normal\s*!important/);
    assert.match(html, /\.ai-assistant-card > div:nth-of-type\(2\)\s*\{\s*flex-wrap:\s*wrap\s*!important/);
    assert.match(core, /btn\.innerText\s*=\s*["']⏳ Menganalisis…["']/);
});

test('Android native PiP uses one shared Activity entry path and sends the app task behind launcher after one Back', () => {
    const main = read('android/app/src/main/java/com/timerproofer/app/MainActivity.java');
    const plugin = read('android/app/src/main/java/com/timerproofer/app/TimerPipPlugin.java');
    assert.match(main, /getOnBackPressedDispatcher\(\)\.addCallback/);
    assert.match(main, /TimerPipPlugin\.requestSystemPictureInPicture\(this\)/);
    assert.match(main, /postDelayed\([\s\S]*isInPictureInPictureMode\(\)[\s\S]*Intent\(Intent\.ACTION_MAIN\)[\s\S]*CATEGORY_HOME/);
    assert.doesNotMatch(main, /void\s+onBackPressed\s*\(/);
    assert.match(plugin, /static synchronized boolean requestSystemPictureInPicture/);
    assert.match(plugin, /pipRequestInProgress/);
    assert.match(plugin, /activity\.isInPictureInPictureMode\(\)/);
});
