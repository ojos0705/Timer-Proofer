/** [AI-GENERATED][QA][V203] Contract tests for the weather API method, input, and upstream bounds. */
import test from 'node:test';
import assert from 'node:assert/strict';
import weatherHandler from '../api/weather.js';

function createResponseHarness() {
    const headers = new Map();
    const result = { statusCode: 200, payload: undefined, ended: false };
    const res = {
        setHeader(name, value) { headers.set(name.toLowerCase(), value); return this; },
        status(code) { result.statusCode = code; return this; },
        json(payload) { result.payload = payload; return this; },
        end() { result.ended = true; return this; }
    };
    return { headers, result, res };
}

test('weather endpoint rejects unsupported methods before upstream calls', async () => {
    const originalFetch = globalThis.fetch;
    let upstreamCalls = 0;
    globalThis.fetch = async () => { upstreamCalls += 1; throw new Error('must not call upstream'); };
    try {
        for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
            const { headers, result, res } = createResponseHarness();
            await weatherHandler({ method, query: { lat: '-7.2', lon: '112.7' }, headers: {} }, res);
            assert.equal(result.statusCode, 405, `${method} should be rejected`);
            assert.equal(result.payload.code, 'METHOD_NOT_ALLOWED');
            assert.equal(headers.get('allow'), 'GET, OPTIONS');
        }
        assert.equal(upstreamCalls, 0, 'unsupported methods must not spend upstream quota');
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('weather preflight returns before validation and upstream requests', async () => {
    const { headers, result, res } = createResponseHarness();
    await weatherHandler({ method: 'OPTIONS', query: {}, headers: {} }, res);
    assert.equal(result.statusCode, 200);
    assert.equal(result.ended, true);
    assert.equal(headers.get('access-control-allow-methods'), 'GET, OPTIONS');
    assert.equal(result.payload, undefined);
});

test('weather endpoint rejects out-of-range coordinates without calling providers', async () => {
    const originalFetch = globalThis.fetch;
    let upstreamCalls = 0;
    globalThis.fetch = async () => { upstreamCalls += 1; throw new Error('must not call upstream'); };
    try {
        const { result, res } = createResponseHarness();
        await weatherHandler({ method: 'GET', query: { lat: '91', lon: '112.7' }, headers: {} }, res);
        assert.equal(result.statusCode, 400);
        assert.match(result.payload.error, /Koordinat/);
        assert.equal(upstreamCalls, 0);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('weather and optional geocoding receive independent abort timeouts', async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.OPENWEATHER_API_KEY;
    const calls = [];
    process.env.OPENWEATHER_API_KEY = 'test-only-key';
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url: String(url), options });
        assert.ok(options.signal instanceof AbortSignal, 'upstream fetch must be abortable');
        assert.equal(options.signal.aborted, false);
        if (String(url).startsWith('https://api.openweathermap.org/')) {
            return { ok: true, status: 200, json: async () => ({ main: { temp: 29 } }) };
        }
        return { ok: true, status: 200, json: async () => ({ display_name: 'Surabaya' }) };
    };
    try {
        const { result, res } = createResponseHarness();
        await weatherHandler({ method: 'GET', query: { lat: '-7.2', lon: '112.7' }, headers: { 'x-forwarded-for': '127.0.0.1' } }, res);
        assert.equal(result.statusCode, 200);
        assert.equal(result.payload.weather.main.temp, 29);
        assert.equal(result.payload.geocode.display_name, 'Surabaya');
        assert.equal(calls.length, 2);
        assert.notEqual(calls[0].options.signal, calls[1].options.signal, 'optional geocoding must not share the primary weather abort signal');
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.OPENWEATHER_API_KEY;
        else process.env.OPENWEATHER_API_KEY = originalKey;
    }
});


test('weather remains available when reverse geocoding is rate-limited', async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.OPENWEATHER_API_KEY;
    process.env.OPENWEATHER_API_KEY = 'test-only-key';
    globalThis.fetch = async (url) => {
        if (String(url).startsWith('https://api.openweathermap.org/')) {
            return { ok: true, status: 200, json: async () => ({ main: { temp: 28 }, weather: [{ id: 800 }] }) };
        }
        return { ok: false, status: 429, json: async () => ({ error: 'rate-limited' }) };
    };
    try {
        const { result, res } = createResponseHarness();
        await weatherHandler({ method: 'GET', query: { lat: '-7.2', lon: '112.7' }, headers: { 'x-forwarded-for': '127.0.0.211' } }, res);
        assert.equal(result.statusCode, 200);
        assert.equal(result.payload.weather.main.temp, 28);
        assert.equal(result.payload.geocode, null);
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.OPENWEATHER_API_KEY;
        else process.env.OPENWEATHER_API_KEY = originalKey;
    }
});

test('weather remains available when reverse geocoding throws a network error', async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.OPENWEATHER_API_KEY;
    process.env.OPENWEATHER_API_KEY = 'test-only-key';
    globalThis.fetch = async (url) => {
        if (String(url).startsWith('https://api.openweathermap.org/')) {
            return { ok: true, status: 200, json: async () => ({ main: { temp: 27 }, weather: [{ id: 801 }] }) };
        }
        throw new Error('simulated geocoding network failure');
    };
    try {
        const { result, res } = createResponseHarness();
        await weatherHandler({ method: 'GET', query: { lat: '-7.2', lon: '112.7' }, headers: { 'x-forwarded-for': '127.0.0.212' } }, res);
        assert.equal(result.statusCode, 200);
        assert.equal(result.payload.weather.main.temp, 27);
        assert.equal(result.payload.geocode, null);
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.OPENWEATHER_API_KEY;
        else process.env.OPENWEATHER_API_KEY = originalKey;
    }
});

test('weather endpoint still fails closed when the primary weather provider fails', async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.OPENWEATHER_API_KEY;
    process.env.OPENWEATHER_API_KEY = 'test-only-key';
    globalThis.fetch = async (url) => {
        if (String(url).startsWith('https://api.openweathermap.org/')) {
            return { ok: false, status: 503, json: async () => ({}) };
        }
        return { ok: true, status: 200, json: async () => ({ display_name: 'Surabaya' }) };
    };
    try {
        const { result, res } = createResponseHarness();
        await weatherHandler({ method: 'GET', query: { lat: '-7.2', lon: '112.7' }, headers: { 'x-forwarded-for': '127.0.0.213' } }, res);
        assert.equal(result.statusCode, 502);
        assert.deepEqual(result.payload, { error: 'Layanan cuaca sementara tidak tersedia' });
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.OPENWEATHER_API_KEY;
        else process.env.OPENWEATHER_API_KEY = originalKey;
    }
});


test('weather remains available when reverse geocoding returns invalid JSON', async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.OPENWEATHER_API_KEY;
    process.env.OPENWEATHER_API_KEY = 'test-only-key';
    globalThis.fetch = async (url) => {
        if (String(url).startsWith('https://api.openweathermap.org/')) {
            return { ok: true, status: 200, json: async () => ({ main: { temp: 26 }, weather: [{ id: 802 }] }) };
        }
        return { ok: true, status: 200, json: async () => { throw new SyntaxError('invalid json'); } };
    };
    try {
        const { result, res } = createResponseHarness();
        await weatherHandler({ method: 'GET', query: { lat: '-7.2', lon: '112.7' }, headers: { 'x-forwarded-for': '127.0.0.214' } }, res);
        assert.equal(result.statusCode, 200);
        assert.equal(result.payload.weather.main.temp, 26);
        assert.equal(result.payload.geocode, null);
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.OPENWEATHER_API_KEY;
        else process.env.OPENWEATHER_API_KEY = originalKey;
    }
});


test('a reverse-geocoding timeout does not abort a successful primary weather request', async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.OPENWEATHER_API_KEY;
    const originalTimeout = AbortSignal.timeout;
    const timeoutControllers = [];
    process.env.OPENWEATHER_API_KEY = 'test-only-key';
    AbortSignal.timeout = (milliseconds) => {
        const controller = new AbortController();
        timeoutControllers.push({ milliseconds, controller });
        return controller.signal;
    };

    globalThis.fetch = async (url, options = {}) => {
        if (String(url).startsWith('https://api.openweathermap.org/')) {
            return { ok: true, status: 200, json: async () => ({ main: { temp: 25 }, weather: [{ id: 803 }] }) };
        }
        return new Promise((resolve, reject) => {
            const signal = options.signal;
            if (signal.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
            }
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
    };

    try {
        const { result, res } = createResponseHarness();
        const request = weatherHandler({
            method: 'GET',
            query: { lat: '-7.2', lon: '112.7' },
            headers: { 'x-forwarded-for': '127.0.0.215' }
        }, res);

        const weatherTimeout = timeoutControllers.find(({ milliseconds }) => milliseconds === 10_000);
        const geocodeTimeout = timeoutControllers.find(({ milliseconds }) => milliseconds === 3_500);
        assert.ok(weatherTimeout, 'primary weather request should have its own timeout');
        assert.ok(geocodeTimeout, 'reverse geocoding should have a shorter independent timeout');
        assert.notEqual(weatherTimeout.controller.signal, geocodeTimeout.controller.signal);

        geocodeTimeout.controller.abort();
        await request;

        assert.equal(weatherTimeout.controller.signal.aborted, false, 'geocoding timeout must not abort the weather signal');
        assert.equal(result.statusCode, 200);
        assert.equal(result.payload.weather.main.temp, 25);
        assert.equal(result.payload.geocode, null);
    } finally {
        globalThis.fetch = originalFetch;
        AbortSignal.timeout = originalTimeout;
        if (originalKey === undefined) delete process.env.OPENWEATHER_API_KEY;
        else process.env.OPENWEATHER_API_KEY = originalKey;
    }
});
