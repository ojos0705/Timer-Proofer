/** [AI-GENERATED][QA][V325] Mini-stat delegated taps and mobile onboarding swipe. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const core = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const onboarding = fs.readFileSync(new URL('../assets/js/features-onboarding.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const version = JSON.parse(fs.readFileSync(new URL('../version.json', import.meta.url), 'utf8'));

function extractBetween(source, start, end) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from + start.length);
    assert.notEqual(from, -1, `missing source start: ${start}`);
    assert.notEqual(to, -1, `missing source end: ${end}`);
    return source.slice(from, to);
}

test('mini weather values use an idempotent delegated click handler outside DOMContentLoaded', () => {
    const binder = extractBetween(core, 'function initMiniStatsSwapBinding()', '// Bind immediately whether app-core loads');
    assert.match(binder, /window\.__TP_MINI_STATS_SWAP_BOUND__/);
    assert.match(binder, /document\.addEventListener\('click'/);
    assert.match(binder, /closest\('#shrunk-main, #shrunk-sub'\)/);
    assert.match(binder, /locationHeader\?\.classList\.contains\('shrunk'\)/);
    assert.match(binder, /jalankanSwapMini\(\)/);
    assert.match(core, /\/\/ Bind immediately[\s\S]*?initMiniStatsSwapBinding\(\);/);
    assert.doesNotMatch(core, /miniMain\.addEventListener\('click'/);
    assert.doesNotMatch(core, /miniSub\.addEventListener\('click'/);
});

test('collapsed stats preserve mobile hit targets and tap interaction', () => {
    assert.match(html, /#location-section\.shrunk #shrunk-main[\s\S]*?pointer-events:\s*auto\s*!important/);
    assert.match(html, /#location-section\.shrunk #shrunk-sub[\s\S]*?touch-action:\s*manipulation/);
    assert.match(html, /#shrunk-main:active\s*\{\s*transform:\s*scale\(0\.95\)/);
    assert.match(html, /#shrunk-sub:active\s*\{\s*transform:\s*scale\(0\.95\)/);
});

test('pre-login onboarding slider supports horizontal Pointer Events and legacy touch fallback', () => {
    const manager = extractBetween(onboarding, 'class OnboardingManager', '// Catatan: inisialisasi OnboardingManager');
    assert.match(manager, /this\.sliderWrapper = this\.screen\?\.querySelector\('\.ob-slider-wrapper'\)/);
    assert.match(manager, /this\.bindSwipeEvents\(\)/);
    assert.match(manager, /wrapper\.addEventListener\('pointerdown', begin/);
    assert.match(manager, /wrapper\.addEventListener\('pointerup', finish/);
    assert.match(manager, /wrapper\.addEventListener\('pointercancel', cancel/);
    assert.match(manager, /wrapper\.addEventListener\('touchstart'/);
    assert.match(manager, /wrapper\.addEventListener\('touchend'/);
    assert.match(manager, /deltaX < 0\) this\.nextSlide\(\)/);
    assert.match(manager, /else this\.previousSlide\(\)/);
    assert.match(manager, /this\.currentSlide = nextIndex/);
    assert.match(manager, /translateX\(-\$\{this\.currentSlide \* 33\.333\}\%\)/);
});

test('onboarding slider allows horizontal swipe without blocking native vertical panning', () => {
    const cssMatch = html.match(/\.ob-slider-wrapper\s*\{([^}]*)\}/);
    assert.ok(cssMatch, 'onboarding slider wrapper CSS must exist');
    const css = cssMatch[1];
    assert.match(css, /touch-action:\s*pan-y/);
    assert.match(css, /user-select:\s*none/);
    assert.match(html, /#onboarding-screen, \.ob-overlay\s*\{[^}]*overscroll-behavior:\s*contain/s);
});

test('technical cache advances to V325 while visible app version remains V125', () => {
    assert.equal(version.version, 'V125');
    assert.equal(version.releaseToken, '20261030-v325');
    assert.equal(version.serviceWorker, 'Timer-Proofing-v1.1.227');
    assert.match(html, /runtime-entry\.js\?v=20261030-v325/);
});
