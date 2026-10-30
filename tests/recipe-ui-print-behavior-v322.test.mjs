/** [AI-GENERATED][QA][V323] Recipe location scroll and saved Premium print regressions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const version = JSON.parse(fs.readFileSync(new URL('../version.json', import.meta.url), 'utf8'));

function extractBetween(source, start, end) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from + start.length);
    assert.notEqual(from, -1, `missing section start: ${start}`);
    assert.notEqual(to, -1, `missing section end: ${end}`);
    return source.slice(from, to);
}

test('recipe detail close returns to recipe master view before closing the recipe modal', () => {
    const closeHandler = extractBetween(appCore, 'function tutupHalamanResepSecaraAman()', '// [AI-GENERATED][REFACTOR] Synchronous UI/legacy read');
    assert.match(closeHandler, /const detailView = document\.getElementById\('recipe-detail-view'\)/);
    assert.match(closeHandler, /if \(detailIsVisible\)[\s\S]*?bukaMasterViewResep\(\)[\s\S]*?return;/);
    assert.ok(closeHandler.indexOf('bukaMasterViewResep()') < closeHandler.indexOf("resepPage.style.display = 'none'"));
});

test('location shrink initializer binds even when app-core loads after DOMContentLoaded', () => {
    assert.match(html, /\.scrollable-content\s*\{[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto/);
    const shrinkBlock = extractBetween(appCore, 'function initLocationHeaderShrinkBehavior()', '/**\n * =========================================================================\n * INISIALISASI UTAMA APLIKASI');
    assert.ok(shrinkBlock.includes("appContainer?.querySelector(':scope > .scrollable-content')"));
    assert.match(shrinkBlock, /header\.dataset\.tpLocationShrinkBound === 'v324'/);
    assert.match(shrinkBlock, /document\.addEventListener\('scroll',[\s\S]*capture:\s*true/);
    assert.match(shrinkBlock, /document\.addEventListener\('wheel', onWheel, \{ capture: true, passive: true \}\)/);
    assert.match(shrinkBlock, /document\.addEventListener\('touchmove', onTouchMove, \{ capture: true, passive: true \}\)/);
    assert.match(shrinkBlock, /setShrunk\(getScrollTop\(eventTarget\) > 24\)/);
    assert.match(appCore, /if \(document\.readyState === 'loading'\)[\s\S]*DOMContentLoaded', initLocationHeaderShrinkBehavior[\s\S]*else \{\s*initLocationHeaderShrinkBehavior\(\)/);
});

test('location identity text uses stable chocolate and dough colors, not weather accent', () => {
    assert.match(html, /#loc-line1\s*\{[^}]*color:\s*#4E342E\s*!important/);
    assert.match(html, /#loc-line2\s*\{[^}]*color:\s*#6D4C41\s*!important/);
    assert.doesNotMatch(html, /#loc-line1\s*\{[^}]*color:\s*var\(--accent\)/);
    assert.doesNotMatch(html, /#loc-line2\s*\{[^}]*color:\s*var\(--accent\)/);
});

test('premium print is awaitable, renders in viewport and waits for layout before capture', () => {
    const printHandler = extractBetween(appCore, 'window.eksekusiCetakPremium = function()', 'window.jalankanAnalisisAIAgent = function');
    assert.doesNotMatch(printHandler, /top\s*=\s*['"]-9999px['"]/);
    assert.match(printHandler, /tempContainer\.style\.position = 'relative'/);
    assert.match(printHandler, /exportOverlay\.setAttribute\('role', 'status'\)/);
    assert.match(printHandler, /requestAnimationFrame\(\(\) => requestAnimationFrame\(resolve\)\)/);
    assert.match(printHandler, /windowHeight:\s*exportHeight/);
    assert.match(printHandler, /pdf\.save\(/);
    assert.match(printHandler, /return \(async \(\) =>/);
    assert.match(printHandler, /finally[\s\S]*tempContainer\.remove\(\)[\s\S]*exportOverlay\.remove\(\)/);
    assert.match(printHandler, /escapeHtmlMarkup\(namaBahan\)/);
    assert.match(printHandler, /escapeHtmlMarkup\(step\)/);
});

test('technical cache token is V327 while product-facing version remains V125', () => {
    assert.equal(version.version, 'V125');
    assert.equal(version.releaseToken, '20261030-v327');
    assert.equal(version.serviceWorker, 'Timer-Proofing-v1.1.229');
    assert.match(html, /runtime-entry\.js\?v=20261030-v327/);
});
