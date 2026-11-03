import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const routerPath = new URL('../api/index.js', import.meta.url);
const { __test, default: router } = await import(pathToFileURL(routerPath.pathname));

test('Vercel deploy exposes one function entrypoint and rewrites public API paths', () => {
  const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(fs.readdirSync(new URL('../api/', import.meta.url)).filter((name) => name.endsWith('.js')).length, 1);
  assert.deepEqual(vercel.rewrites, [{ source: '/api/:path*', destination: '/api/index?__api_route=:path*' }]);
});

test('API router registers all 17 existing endpoint names', () => {
  assert.equal(__test.routeNames.length, 17);
  for (const route of [
    'ai-analyze', 'ai-cost-summary', 'ai-telemetry', 'ai-tips', 'create-payment-token',
    'feature-access', 'finance-admin-summary', 'finance-midtrans-reconcile', 'finance-payout-import',
    'midtrans-notification', 'monetization-catalog', 'my-entitlements', 'payment-status',
    'start-free-trial', 'translate-languages', 'translate', 'weather'
  ]) assert.ok(__test.routeNames.includes(route), `missing route ${route}`);
});

test('API router resolves rewritten routes and rejects traversal or unknown paths', () => {
  const req = (route, url = '/api/index') => ({ query: { __api_route: route }, url });
  assert.ok(__test.resolveRoute(req('payment-status')));
  assert.ok(__test.resolveRoute(req('translate.js')));
  assert.equal(__test.resolveRoute(req('../package')), null);
  assert.equal(__test.resolveRoute(req('missing-endpoint')), null);
});

test('API router returns 404 for unknown endpoint without invoking a handler', async () => {
  let statusCode;
  let payload;
  const res = {
    setHeader() {},
    status(code) { statusCode = code; return this; },
    json(value) { payload = value; return value; }
  };
  await router({ query: { __api_route: 'not-a-route' }, url: '/api/index?__api_route=not-a-route' }, res);
  assert.equal(statusCode, 404);
  assert.equal(payload.error, 'API endpoint tidak ditemukan.');
});
