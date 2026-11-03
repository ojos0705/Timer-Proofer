/** [AI-GENERATED][QA][V323] Location shrink and saved-recipe Premium PDF behavior. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const core = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');

function bodyBetween(start, end) {
    const from = core.indexOf(start);
    const to = core.indexOf(end, from + start.length);
    assert.ok(from >= 0, `Missing start marker: ${start}`);
    assert.ok(to > from, `Missing end marker: ${end}`);
    return core.slice(from, to);
}

test('location header reads actual nested scroll targets and supports wheel/touch fallback', () => {
    const body = bodyBetween('function initLocationHeaderShrinkBehavior()', '/**\n * =========================================================================\n * INISIALISASI UTAMA APLIKASI');
    assert.match(body, /Number\(node\.scrollTop\)/);
    assert.match(body, /getMainScrollArea/);
    assert.match(body, /isMainContentTarget/);
    assert.match(body, /document\.addEventListener\('scroll', onScroll, \{ capture: true, passive: true \}\)/);
    assert.match(body, /document\.addEventListener\('wheel', onWheel, \{ capture: true, passive: true \}\)/);
    assert.match(body, /document\.addEventListener\('touchmove', onTouchMove, \{ capture: true, passive: true \}\)/);
    assert.match(body, /window\.__TP_LOCATION_SHRINK_READY__ = true/);
});

test('saved recipe Print uses the Premium PDF pipeline instead of a reduced print popup', () => {
    const listBody = bodyBetween("card.querySelector('.recipe-print-btn').addEventListener", "card.querySelector('.recipe-delete-btn').addEventListener");
    assert.match(listBody, /await window\.cetakResepTersimpanPremium\(resep\)/);
    assert.doesNotMatch(listBody, /window\.open\(/);
    const premiumHelper = bodyBetween('window.cetakResepTersimpanPremium = async function(resep)', 'window.jalankanAnalisisAIAgent = function');
    assert.match(premiumHelper, /resep\.bahanBaku \|\| resep\.ingredients/);
    assert.match(premiumHelper, /window\.statusKategoriResep\[category\] = true/);
    assert.match(premiumHelper, /await window\.eksekusiCetakPremium\(\)/);
    assert.match(premiumHelper, /finally[\s\S]*bakeryIngredients = previousIngredients[\s\S]*window\.statusKategoriResep = previousCategoryState/);
});

test('Premium exporter returns a Promise so temporary saved-recipe state is restored after rendering', () => {
    const exporter = bodyBetween('window.eksekusiCetakPremium = function()', 'window.cetakResepTersimpanPremium = async function');
    assert.match(exporter, /return \(async \(\) =>/);
    assert.match(exporter, /pdf\.save\(/);
    assert.match(exporter, /return true/);
    assert.match(exporter, /return false/);
    assert.match(exporter, /finally[\s\S]*window\.__TP_PREMIUM_PDF_EXPORTING__ = false/);
});
