/** [AI-GENERATED][QA][V333] Full-width onboarding slides, compact auth viewport and actionable translation errors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const onboarding = read('assets/js/features-onboarding.js');
const html = read('www/index.html');
const apiClient = read('assets/js/api-client-service.js');
const languageEngine = read('assets/js/language-engine.js');
const version = JSON.parse(read('version.json'));

function between(source, start, end) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from + start.length);
    assert.notEqual(from, -1, `missing source start: ${start}`);
    assert.notEqual(to, -1, `missing source end: ${end}`);
    return source.slice(from, to);
}

test('V334 onboarding keeps exact one-page flex slides and measured pixel offsets', () => {
    const styles = between(html, '.ob-slider-track {', '.ob-illustration {');
    assert.match(styles, /width:\s*100%/);
    assert.match(styles, /flex:\s*0 0 100%/);
    assert.match(styles, /\.ob-slide\s*\{[^}]*flex:\s*0 0 100%/s);
    assert.match(styles, /min-width:\s*100%/);
    const update = between(onboarding, '    updateSliderPosition() {', '    goToSlide(index) {');
    assert.match(update, /getBoundingClientRect/);
    assert.match(update, /width \* this\.currentSlide/);
    assert.match(update, /translate3d\(-\$\{offset\}px, 0, 0\)/);
    assert.match(onboarding, /visualViewport\?\.addEventListener\('resize'/);
});

test('Onboarding illustration and copy shrink on short screens without changing swipe ownership', () => {
    assert.match(html, /#onboarding-screen \.ob-illustration\s*\{\s*width:\s*clamp\(88px, 20vmin, 132px\)/);
    assert.match(html, /#onboarding-screen \.ob-title\s*\{\s*font-size:\s*clamp/);
    assert.match(html, /safe-area-inset-bottom/);
    const manager = between(onboarding, 'class OnboardingManager', '// Catatan: inisialisasi OnboardingManager');
    assert.match(manager, /wrapper\.addEventListener\('pointerdown', begin/);
    assert.match(manager, /deltaX < 0\) this\.nextSlide\(\)/);
});

test('V334 login/register card fills mobile viewport edge-to-edge and scrolls internally', () => {
    assert.match(html, /body\.logged-out\s*\{[^}]*align-items:\s*stretch/s);
    assert.match(html, /@media \(max-width:\s*600px\)\s*\{[\s\S]*?body\.logged-out #auth-wrapper\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*border-radius:\s*0;/s);
    assert.match(html, /body\.logged-out #auth-wrapper\s*\{[^}]*max-height:\s*100%/s);
    assert.match(html, /body\.logged-out #auth-wrapper \.inputs-wrapper\s*\{\s*min-height:\s*0/);
    assert.match(html, /body\.logged-out #auth-wrapper\s*\{[^}]*overflow-y:\s*auto/s);
    assert.match(html, /padding-top:\s*calc\(env\(safe-area-inset-top/s);
    assert.match(html, /padding-bottom:\s*calc\(env\(safe-area-inset-bottom/s);
    assert.match(html, /body\.logged-out #auth-wrapper::-webkit-scrollbar/);
});

test('API client exposes stable route, invalid-response and network codes', () => {
    assert.match(apiClient, /API_ROUTE_NOT_FOUND/);
    assert.match(apiClient, /API_INVALID_RESPONSE/);
    assert.match(apiClient, /API_NETWORK_ERROR/);
    assert.match(apiClient, /networkError\.status = 0/);
});

test('V334 language picker explains free-provider limits and deployment/network errors', () => {
    assert.match(languageEngine, /MyMemory/);
    assert.match(languageEngine, /TRANSLATION_QUOTA_EXCEEDED/);
    assert.match(languageEngine, /MYMEMORY_CONTACT_EMAIL/);
    assert.match(languageEngine, /50\.000 karakter\/hari/);
    assert.match(languageEngine, /API_ROUTE_NOT_FOUND/);
    assert.match(languageEngine, /API_NETWORK_ERROR/);
    assert.match(languageEngine, /UNCLASSIFIED_TRANSLATION_ERROR/);
});

test('V334 advances only technical metadata while product version stays V125', () => {
    assert.equal(version.version, 'V125');
    assert.equal(version.releaseToken, '20261101-v336');
    assert.equal(version.serviceWorker, 'Timer-Proofing-v1.1.238');
    assert.match(html, /runtime-entry\.js\?v=20261101-v336/);
});
