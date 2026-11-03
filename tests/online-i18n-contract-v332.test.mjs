/** [AI-GENERATED][QA][V334] Free MyMemory online localization DOM safety and runtime contracts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const online = read('assets/js/online-i18n.js');
const cloud = read('assets/js/cloud-translation-service.js');
const engine = read('assets/js/language-engine.js');
const api = read('serverless/api/translate.js');
const catalogApi = read('serverless/api/translate-languages.js');
const languageCodes = read('serverless/api/translation-language-codes.js');

test('online translation skips user-authored recipe records but translates static recipe editor UI', () => {
    const skipIds = online.match(/const SKIP_IDS = new Set\(\[([\s\S]*?)\]\);/)?.[1] || '';
    assert.doesNotMatch(skipIds, /recipe-detail-view|method-steps-content/);
    assert.match(skipIds, /container-daftar-langkah/);
    assert.match(skipIds, /recipe-cards-container/);
    assert.match(online, /nodeValue = value/);
    assert.match(online, /function decodeTranslationEntities/);
    assert.match(online, /String\.fromCodePoint\(codePoint\)/);
    assert.doesNotMatch(online, /innerHTML\s*=/);
});

test('browser batches match MyMemory server limits and cache unique strings per target language', () => {
    assert.match(online, /maxItems:\s*24,\s*maxCharacters:\s*5_400/);
    assert.match(online, /uniqueMissing/);
    assert.match(online, /saveCache\(language\)/);
    assert.match(cloud, /MAX_BATCH_ITEMS = 24/);
    assert.match(cloud, /MAX_BATCH_CHARACTERS = 5_400/);
    assert.match(api, /const MAX_ITEMS = 24/);
    assert.match(api, /const MAX_TOTAL_CHARACTERS = 5_400/);
    assert.match(api, /MAX_PROVIDER_SEGMENT_BYTES = 480/);
});

test('free translation proxy requires a signed-in session and uses optional MyMemory contact email only server-side', () => {
    assert.match(api, /api\.mymemory\.translated\.net\/get/);
    assert.match(api, /requireSupabaseUser/);
    assert.match(api, /MYMEMORY_CONTACT_EMAIL/);
    assert.match(api, /mt', '1'/);
    assert.doesNotMatch(api, /GOOGLE_CLOUD_TRANSLATE_API_KEY/);
    assert.doesNotMatch(cloud, /MYMEMORY_CONTACT_EMAIL|GOOGLE_CLOUD_TRANSLATE_API_KEY/);
    assert.match(cloud, /Authorization: `Bearer \${session\.access_token}`/);
});

test('candidate language list is local; provider-pair support is checked only when selected', () => {
    assert.match(cloud, /import \{ daftarBahasa \} from '\.\/lang-data\.js'/);
    assert.match(cloud, /catalogType: 'candidate'/);
    assert.doesNotMatch(cloud, /LANGUAGE_ENDPOINT/);
    assert.match(catalogApi, /TRANSLATION_LANGUAGE_CANDIDATES/);
    assert.match(languageCodes, /'ab'/);
    assert.match(engine, /TRANSLATION_UNSUPPORTED_LANGUAGE/);
});

test('cloud client retries only transient network/upstream errors and treats auth/quota/pair errors as terminal', () => {
    assert.match(cloud, /async function requestWithRetry/);
    assert.match(cloud, /TRANSLATION_AUTH_INVALID/);
    assert.match(cloud, /TRANSLATION_QUOTA_EXCEEDED/);
    assert.match(cloud, /TRANSLATION_UNSUPPORTED_LANGUAGE/);
    assert.match(cloud, /attempt >= retries/);
    assert.match(cloud, /export function isRetryableRequestError/);
    assert.match(online, /MAX_PENDING_FLUSH_RETRIES = 1/);
    assert.match(online, /isRetryableRequestError\(error\)/);
    assert.match(online, /schedulePendingFlush\(1_500\)/);
    assert.match(online, /schedulePendingFlush\(180\)/);
    assert.match(online, /mutation\.target\.nodeValue === record\.applied/);
    assert.match(online, /attributeRecord && mutation\.target\.getAttribute\(mutation\.attributeName\) === attributeRecord\.applied/);
});

test('translation APIs allow Authorization in CORS preflight and the app still uses the ESM translation engine', () => {
    assert.match(api, /Access-Control-Allow-Headers[^\n]*Authorization/);
    assert.match(catalogApi, /Access-Control-Allow-Headers[^\n]*Authorization/);
    assert.match(engine, /modal-bootstrap\.js\?v=20261102-v342/);
    assert.match(engine, /syncModalBodyScrollLock/);
    assert.doesNotMatch(engine, /googleTranslateElementInit/);
});
