import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFile as readPackage } from 'node:fs/promises';
import { runMonetizationSandboxSmoke } from '../scripts/monetization-sandbox-smoke-utils.mjs';

const orderId = 'TPP-TEST-ORDER-1234567890';
const baseEnv = {
  MIDTRANS_IS_PRODUCTION: 'false',
  MIDTRANS_SERVER_KEY: 'SB-Mid-server-test-secret',
  MONETIZATION_SANDBOX_BASE_URL: 'https://timer-proofer-sandbox.vercel.app',
  MONETIZATION_SANDBOX_USER_ACCESS_TOKEN: 'user-access-token-secret',
  MONETIZATION_SANDBOX_ORDER_ID: orderId
};
const response = (status, payload) => ({ ok: status >= 200 && status < 300, status, json: async () => payload });
function successfulFetch(overrides = {}) {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('api.sandbox.midtrans.com')) return response(200, overrides.provider || {
      order_id: orderId, gross_amount: '19900.00', currency: 'IDR', transaction_status: 'settlement'
    });
    if (String(url).includes('/api/payment-status')) return response(200, overrides.payment || {
      order: { order_id: orderId, amount: 19900, currency: 'IDR', status: 'paid', plan_id: 'lite-monthly' }
    });
    return response(200, overrides.entitlement || {
      is_premium: true, membership: { status: 'active', plan_id: 'lite-monthly' }
    });
  };
  return { fetch, calls };
}

test('Stage J refuses production mode and non-Sandbox keys before network access', async () => {
  let calls = 0;
  await assert.rejects(() => runMonetizationSandboxSmoke({ ...baseEnv, MIDTRANS_IS_PRODUCTION: 'true' }, async () => { calls++; }), /harus ditetapkan eksplisit ke false/);
  await assert.rejects(() => runMonetizationSandboxSmoke({ ...baseEnv, MIDTRANS_SERVER_KEY: 'Mid-server-prod' }, async () => { calls++; }), /bukan key Sandbox/);
  assert.equal(calls, 0);
});

test('Stage J requires HTTPS public deployment URL and complete test account config', async () => {
  await assert.rejects(() => runMonetizationSandboxSmoke({ ...baseEnv, MONETIZATION_SANDBOX_BASE_URL: 'http://localhost:3000' }), /HTTPS publik/);
  const missing = { ...baseEnv }; delete missing.MONETIZATION_SANDBOX_USER_ACCESS_TOKEN;
  await assert.rejects(() => runMonetizationSandboxSmoke(missing), /MONETIZATION_SANDBOX_USER_ACCESS_TOKEN/);
});

test('Stage J performs read-only provider, payment-status and entitlement checks', async () => {
  const { fetch, calls } = successfulFetch();
  const result = await runMonetizationSandboxSmoke(baseEnv, fetch);
  assert.equal(result.certified, true);
  assert.equal(result.environment, 'midtrans-sandbox');
  assert.equal(result.amount_idr, 19900);
  assert.equal(result.plan_id, 'lite-monthly');
  assert.equal(calls.length, 3);
  assert.match(calls[0].url, /^https:\/\/api\.sandbox\.midtrans\.com\/v2\//);
  assert.match(calls[1].url, /\/api\/payment-status\?/);
  assert.match(calls[2].url, /\/api\/my-entitlements$/);
  assert.equal(calls.some((call) => call.options.method === 'POST'), false);
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('Stage J rejects provider identity, currency and amount mismatches', async () => {
  let state = successfulFetch({ provider: { order_id: 'OTHER-ORDER', gross_amount: '19900.00', currency: 'IDR', transaction_status: 'settlement' } });
  await assert.rejects(() => runMonetizationSandboxSmoke(baseEnv, state.fetch), /Order ID.*tidak cocok/);
  state = successfulFetch({ provider: { order_id: orderId, gross_amount: '19900.00', currency: 'USD', transaction_status: 'settlement' } });
  await assert.rejects(() => runMonetizationSandboxSmoke(baseEnv, state.fetch), /bukan IDR/);
  state = successfulFetch({ payment: { order: { order_id: orderId, amount: 20000, currency: 'IDR', status: 'paid', plan_id: 'lite-monthly' } } });
  await assert.rejects(() => runMonetizationSandboxSmoke(baseEnv, state.fetch), /tidak cocok/);
});

test('Stage J does not certify pending/failed provider transactions or unprocessed webhook state', async () => {
  let state = successfulFetch({ provider: { order_id: orderId, gross_amount: '19900.00', currency: 'IDR', transaction_status: 'pending' } });
  await assert.rejects(() => runMonetizationSandboxSmoke(baseEnv, state.fetch), /belum berstatus berhasil/);
  state = successfulFetch({ payment: { order: { order_id: orderId, amount: 19900, currency: 'IDR', status: 'pending', plan_id: 'lite-monthly' } } });
  await assert.rejects(() => runMonetizationSandboxSmoke(baseEnv, state.fetch), /belum paid/);
});

test('Stage J requires active entitlement for the exact purchased plan', async () => {
  let state = successfulFetch({ entitlement: { is_premium: true, membership: { status: 'active', plan_id: 'pro-monthly' } } });
  await assert.rejects(() => runMonetizationSandboxSmoke(baseEnv, state.fetch), /belum terkonfirmasi/);
  state = successfulFetch({ entitlement: { is_premium: false, membership: { status: 'active', plan_id: 'lite-monthly' } } });
  await assert.rejects(() => runMonetizationSandboxSmoke(baseEnv, state.fetch), /tidak menandai akun uji/);
});

test('Stage J runner is read-only and does not log credentials', async () => {
  const runner = await readFile(new URL('../scripts/monetization-sandbox-smoke.mjs', import.meta.url), 'utf8');
  assert.match(runner, /Read-only live check/);
  assert.doesNotMatch(runner, /console\.log\([^\n]*(SERVER_KEY|ACCESS_TOKEN)/);
  const packageJson = JSON.parse(await readPackage(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(packageJson.scripts['test:monetization-sandbox'], 'node scripts/monetization-sandbox-smoke.mjs');
});
