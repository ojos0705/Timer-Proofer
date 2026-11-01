/** [AI-GENERATED][QA][V330] App Tour safe-area positioning and Android Back ownership. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const onboarding = read('assets/js/features-onboarding.js');
const core = read('assets/js/app-core.js');
const html = read('www/index.html');
const version = JSON.parse(read('version.json'));

function extractBetween(source, start, end) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from + start.length);
    assert.notEqual(from, -1, `missing source start: ${start}`);
    assert.notEqual(to, -1, `missing source end: ${end}`);
    return source.slice(from, to);
}

test('V330 tooltip card is bounded by viewport and supports vertical touch scrolling', () => {
    const css = extractBetween(html, '.tour-tooltip-card {', '.tour-tooltip-card.active');
    assert.match(css, /env\(safe-area-inset-top/);
    assert.match(css, /env\(safe-area-inset-bottom/);
    assert.match(css, /max-height:\s*calc\(100dvh/);
    assert.match(css, /overflow-y:\s*auto/);
    assert.match(css, /overscroll-behavior-y:\s*contain/);
    assert.match(css, /-webkit-overflow-scrolling:\s*touch/);
    assert.match(css, /touch-action:\s*pan-y/);
    assert.match(html, /\.tour-footer\s*\{[^}]*position:\s*sticky/s);
});

test('V330 tooltip measures updated step content and clamps position to the visible viewport', () => {
    const render = extractBetween(onboarding, '    renderTourStep() {', '    stopTourRenderTimer() {');
    assert.ok(render.indexOf('this.tourDesc.innerText = step.description') < render.indexOf('this.positionTooltip(targetEl || null)'));
    assert.match(render, /requestAnimationFrame\(\(\) => window\.requestAnimationFrame\(updatePosition\)\)/);

    const position = extractBetween(onboarding, '    positionTooltip(targetEl) {', '    switchAppTabIfNeeded(tabName) {');
    assert.match(position, /window\.visualViewport/);
    assert.match(position, /--tour-safe-area-top/);
    assert.match(position, /--tour-safe-area-bottom/);
    assert.match(position, /this\.tooltipCard\.style\.maxHeight/);
    assert.match(position, /Math\.min\(Math\.max\(topPos, minTop\), maxTop\)/);
});

test('V330 Android Back returns one App Tour step instead of minimizing or entering PiP', () => {
    const manager = extractBetween(onboarding, '    isTourActive() {', '    switchAppTabIfNeeded(tabName) {');
    assert.match(manager, /isTourActive\(\)/);
    assert.match(manager, /handleBackButton\(\)/);
    assert.match(manager, /if \(this\.currentTourStep > 0\) this\.prevTourStep\(\)/);
    assert.match(manager, /else this\.endTour\(\)/);
    assert.match(manager, /return true/);

    const backCallback = extractBetween(core, "    onBackButton: async (source = 'native-back') => {", '    onBackground: async () => {');
    assert.ok(backCallback.indexOf('window.appOnboarding?.handleBackButton?.()') < backCallback.indexOf('const timerIsActive'));
    assert.match(backCallback, /if \(window\.appOnboarding\?\.handleBackButton\?\.\(\) === true\) return true/);
});

test('V330 leaves product-facing version unchanged and advances only technical cache/release tokens', () => {
    assert.equal(version.version, 'V125');
    assert.equal(version.releaseToken, '20261031-v330');
    assert.equal(version.serviceWorker, 'Timer-Proofing-v1.1.232');
    assert.match(html, /runtime-entry\.js\?v=20261031-v330/);
});
