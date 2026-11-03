import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../serverless/api/translate.js';

function responseStub() {
  return {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; }
  };
}

test('GET /api/translate is a safe endpoint health check; it does not perform translation', async () => {
  const res = responseStub();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.endpoint, 'reachable');
  assert.equal(res.body.translationMethod, 'POST');
  assert.equal(res.body.authenticationRequired, true);
  assert.equal(res.headers.allow, 'GET, POST, OPTIONS');
  assert.match(res.headers['access-control-allow-methods'], /GET/);
});

test('Translation requests remain POST-only and authenticated', async () => {
  const res = responseStub();
  await handler({ method: 'POST', headers: {}, body: { texts: ['Hello'], targetLanguage: 'en' } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'TRANSLATION_AUTH_REQUIRED');
});
