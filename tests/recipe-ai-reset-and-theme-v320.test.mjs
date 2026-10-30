import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const core = readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../www/sw.js', import.meta.url), 'utf8');
const version = JSON.parse(readFileSync(new URL('../version.json', import.meta.url), 'utf8'));

function functionBody(source, name, nextMarker) {
  const start = source.indexOf(name);
  assert.ok(start >= 0, `Function/source marker not found: ${name}`);
  const end = source.indexOf(nextMarker, start);
  assert.ok(end > start, `End marker not found after ${name}`);
  return source.slice(start, end);
}

test('top recipe close button is handled by the single delegated data-action owner', () => {
  assert.match(html, /id="btn-recipe-close-top"[^>]*data-action="tutupHalamanResepSecaraAman"/);
  assert.match(core, /window\.tutupHalamanResepSecaraAman\s*=\s*tutupHalamanResepSecaraAman/);
  assert.doesNotMatch(core, /btnRecipeCloseTop\.addEventListener/);
});

test('both new-recipe entry points and switching to an existing recipe clear old AI output', () => {
  const openNew = functionBody(core, 'function bukaDetailResepBaru()', 'function bukaDetailResepEksisting');
  const openExisting = functionBody(core, 'function bukaDetailResepEksisting(resep)', '// [AI-GENERATED][REFACTOR][V98]');
  const topNew = functionBody(core, 'window.buatResepBaruForm = function()', 'window.simpanResepKeDatabase');
  assert.match(openNew, /resetRecipeAiAnalysisState\(\)/);
  assert.match(openExisting, /resetRecipeAiAnalysisState\(\)/);
  assert.match(topNew, /resetRecipeAiAnalysisState\(\)/);
});

test('recipe AI reset hides and empties the old report and restores the live-analysis button', () => {
  const reset = functionBody(core, 'function resetRecipeAiAnalysisState()', 'async function mintaAnalisisAISungguhan');
  assert.match(reset, /recipeAiAnalysisRequestEpoch\s*\+=\s*1/);
  assert.match(reset, /getElementById\('ai-live-result'\)/);
  assert.match(reset, /replaceChildren\(\)/);
  assert.match(reset, /style\.display\s*=\s*'none'/);
  assert.match(reset, /button\.disabled\s*=\s*false/);
});

test('late AI responses from an earlier recipe cannot repopulate the newly reset editor', () => {
  const ai = functionBody(core, 'async function mintaAnalisisAISungguhan()', '// ------------------------------------------------------------\n// STATISTIK');
  assert.match(ai, /const requestEpoch = recipeAiAnalysisRequestEpoch/);
  assert.match(ai, /if \(requestEpoch !== recipeAiAnalysisRequestEpoch\) return/);
  assert.match(ai, /requestEpoch === recipeAiAnalysisRequestEpoch && btn/);
});

test('weather-driven accent is scoped to location header and no longer recolors global bakery UI', () => {
  const theme = functionBody(core, 'function updateDynamicTheme(weatherId, mainWeather)', '/**\n * [AI-GENERATED][BUGFIX][V311]');
  assert.doesNotMatch(theme, /body\.style\.background\s*=/);
  assert.doesNotMatch(theme, /root\.style\.setProperty\('--accent'/);
  assert.match(theme, /locationSectionHeader\.style\.setProperty\('--accent',\s*accentColor\)/);
  assert.match(html, /--text-dark:\s*#4E342E/);
  assert.match(html, /id="ai-recommendation"[^>]*color:\s*#4E342E/);
});

test('technical cache boundary is V321 while visible product version remains V125', () => {
  assert.equal(version.version, 'V125');
  assert.equal(version.releaseToken, '20261030-v321');
  assert.equal(version.serviceWorker, 'Timer-Proofing-v1.1.223');
  assert.match(html, /runtime-entry\.js\?v=20261030-v321/);
  assert.match(sw, /const CACHE_NAME = 'Timer-Proofing-v1\.1\.223'/);
});
