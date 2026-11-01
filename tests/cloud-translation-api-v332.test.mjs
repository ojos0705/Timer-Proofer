/** [AI-GENERATED][QA][V334] Authenticated free MyMemory translation proxy. */
import test from 'node:test';
import assert from 'node:assert/strict';
import translateHandler, { __test as translateTest } from '../api/translate.js';
import languagesHandler, { __test as languagesTest } from '../api/translate-languages.js';

function makeResponse() {
    return {
        statusCode: 200,
        headers: {},
        body: null,
        ended: false,
        setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
        status(code) { this.statusCode = code; return this; },
        json(value) { this.body = value; return this; },
        end() { this.ended = true; return this; }
    };
}

const originalFetch = globalThis.fetch;
const originalContactEmail = process.env.MYMEMORY_CONTACT_EMAIL;

test('translation and candidate language routes allow Capacitor Authorization CORS preflight', async () => {
    const translateResponse = makeResponse();
    await translateHandler({ method: 'OPTIONS', headers: {} }, translateResponse);
    assert.equal(translateResponse.statusCode, 200);
    assert.match(translateResponse.headers['access-control-allow-headers'], /Authorization/i);

    const catalogResponse = makeResponse();
    await languagesHandler({ method: 'OPTIONS', headers: {} }, catalogResponse);
    assert.equal(catalogResponse.statusCode, 200);
    assert.match(catalogResponse.headers['access-control-allow-methods'], /GET/);
});

test('MyMemory validation enforces item, character, target and per-provider byte limits', () => {
    assert.equal(translateTest.validateRequest({ texts: ['Halo'], targetLanguage: 'fr' }).targetLanguage, 'fr');
    assert.equal(translateTest.validateRequest({ texts: ['Halo'], targetLanguage: 'id' }).code, 'TRANSLATION_INVALID_LANGUAGE');
    assert.equal(translateTest.validateRequest({ texts: [' '], targetLanguage: 'fr' }).code, 'TRANSLATION_INVALID_TEXT');
    assert.equal(translateTest.validateRequest({ texts: ['x'.repeat(5001)], targetLanguage: 'fr' }).status, 413);
    assert.equal(translateTest.parseBody('{bad json'), null);

    const source = `  ${'roti tawar lembut '.repeat(80)}  `;
    const chunks = translateTest.splitProviderSegments(source);
    assert.ok(chunks.length > 1);
    assert.equal(chunks.join(''), source);
    assert.ok(chunks.every((chunk) => Buffer.byteLength(chunk, 'utf8') <= 480));
});

test('translation endpoint requires a verified Supabase session before calling MyMemory', async () => {
    let providerCalled = false;
    globalThis.fetch = async (url) => {
        if (String(url).includes('/auth/v1/user')) return { ok: false, status: 401, async json() { return {}; } };
        providerCalled = true;
        throw new Error('provider must not be called');
    };
    try {
        const res = makeResponse();
        await translateHandler({ method: 'POST', headers: {}, body: { texts: ['Tes no auth 334'], targetLanguage: 'en' } }, res);
        assert.equal(res.statusCode, 401);
        assert.equal(res.body.code, 'TRANSLATION_AUTH_REQUIRED');
        assert.equal(providerCalled, false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('authenticated translation reaches MyMemory and returns translations in source order without credentials', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        const address = String(url);
        calls.push({ address, options });
        if (address.includes('/auth/v1/user')) {
            return { ok: true, status: 200, async json() { return { id: 'user-mymemory-v334' }; } };
        }
        assert.ok(address.startsWith('https://api.mymemory.translated.net/get?'));
        return {
            ok: true,
            status: 200,
            async json() { return { responseStatus: 200, responseData: { translatedText: 'Hello there' } }; }
        };
    };
    try {
        const res = makeResponse();
        await translateHandler({
            method: 'POST',
            headers: { authorization: 'Bearer test-user-access-token' },
            body: { texts: ['MyMemory unique text A v334', 'MyMemory unique text B v334'], targetLanguage: 'en' }
        }, res);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body.translations, ['Hello there', 'Hello there']);
        assert.equal(calls.length, 3);
        assert.equal(calls[0].options.headers.Authorization, 'Bearer test-user-access-token');
        const providerCalls = calls.filter((call) => call.address.includes('api.mymemory'));
        assert.equal(providerCalls.length, 2);
        const providerUrl = new URL(providerCalls.find((call) => new URL(call.address).searchParams.get('q') === 'MyMemory unique text A v334').address);
        assert.equal(providerUrl.searchParams.get('langpair'), 'id|en');
        assert.equal(providerUrl.searchParams.get('mt'), '1');
        assert.equal(providerUrl.searchParams.get('q'), 'MyMemory unique text A v334');
        assert.doesNotMatch(JSON.stringify(res.body), /test-user-access-token|GOOGLE_CLOUD_TRANSLATE_API_KEY/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('optional contact email enables the documented higher MyMemory free quota without an API key', async () => {
    process.env.MYMEMORY_CONTACT_EMAIL = 'translation-support@example.invalid';
    const seen = [];
    globalThis.fetch = async (url) => {
        const address = String(url);
        seen.push(address);
        if (address.includes('/auth/v1/user')) return { ok: true, status: 200, async json() { return { id: 'user-contact-v334' }; } };
        return { ok: true, status: 200, async json() { return { responseStatus: 200, responseData: { translatedText: 'Bonjour' } }; } };
    };
    try {
        const res = makeResponse();
        await translateHandler({
            method: 'POST', headers: { authorization: 'Bearer test-token' },
            body: { texts: ['Optional contact email test 334'], targetLanguage: 'fr' }
        }, res);
        assert.equal(res.statusCode, 200);
        const providerUrl = new URL(seen.find((value) => value.includes('api.mymemory')));
        assert.equal(providerUrl.searchParams.get('de'), 'translation-support@example.invalid');
    } finally {
        globalThis.fetch = originalFetch;
        if (originalContactEmail === undefined) delete process.env.MYMEMORY_CONTACT_EMAIL;
        else process.env.MYMEMORY_CONTACT_EMAIL = originalContactEmail;
    }
});

test('MyMemory response normalization preserves surrounding whitespace exactly', () => {
    assert.equal(translateTest.preserveProviderWhitespace('  Halo  ', '  Hello  '), '  Hello  ');
    assert.equal(translateTest.preserveProviderWhitespace('\nAdonan\t', ' Dough '), '\nDough\t');
});

test('MyMemory quota and unsupported-pair errors are reported distinctly', () => {
    const quota = translateTest.classifyMyMemoryFailure(429, { responseDetails: 'Daily quota exceeded' });
    assert.equal(quota.status, 429);
    assert.equal(quota.code, 'TRANSLATION_QUOTA_EXCEEDED');

    const unsupported = translateTest.classifyMyMemoryFailure(422, { responseDetails: 'Unsupported language pair' });
    assert.equal(unsupported.status, 422);
    assert.equal(unsupported.code, 'TRANSLATION_UNSUPPORTED_LANGUAGE');

    const invalidPair = translateTest.classifyMyMemoryFailure(422, { responseDetails: 'PLEASE SELECT TWO DISTINCT LANGUAGES' });
    assert.equal(invalidPair.status, 422);
    assert.equal(invalidPair.code, 'TRANSLATION_UNSUPPORTED_LANGUAGE');
});

test('local candidate catalog does not claim actual MyMemory pair support', async () => {
    const res = makeResponse();
    await languagesHandler({ method: 'GET', headers: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.provider, 'MyMemory');
    assert.equal(res.body.catalogType, 'candidate');
    assert.ok(res.body.languages.includes('ab'));
    assert.ok(!res.body.languages.includes('id'));
    assert.match(res.body.note, /bukan jaminan/);
    assert.ok(languagesTest.candidateLanguages.length >= 100);
});

test('per-user translation rate limit remains bounded', () => {
    let limited = null;
    const res = { headers: {}, setHeader(name, value) { this.headers[name] = value; } };
    const userId = `rate-test-${Date.now()}`;
    for (let index = 0; index < 25; index += 1) {
        limited = translateTest.enforceRateLimit({ headers: {} }, res, userId);
    }
    assert.ok(limited?.retryAfter >= 1);
    assert.equal(res.headers['Retry-After'] !== undefined, true);
});

test.after(() => {
    globalThis.fetch = originalFetch;
    if (originalContactEmail === undefined) delete process.env.MYMEMORY_CONTACT_EMAIL;
    else process.env.MYMEMORY_CONTACT_EMAIL = originalContactEmail;
});
