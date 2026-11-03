/** [AI-GENERATED][QA][V341] Regression tests for server-authoritative Premium monetization. */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  DEFAULT_SUPABASE_ANON_KEY, getActivePlan, getBearerToken, getPublicCatalog, getPlans, getPlanById,
  mapMidtransStatus, parseBody, verifyMidtransSignature, requireSupabaseUser,
  MonetizationError, createOrderId, midtransBaseUrl
} from '../serverless/api/monetization-utils.js';

const validEnv = {
  MONETIZATION_PLANS_JSON: JSON.stringify([
    { id: 'premium-monthly', name: 'Premium Bulanan', amount: 59000, duration_days: 30, active: true }
  ])
};

test('V342 catalog accepts one active server-owned plan and exposes no secret fields', () => {
  const catalog = getPublicCatalog(validEnv);
  assert.deepEqual(catalog, {
    currency: 'IDR',
    plans: [{ id: 'premium-monthly', name: 'Premium Bulanan', amount: 59000, currency: 'IDR', duration_days: 30, period_label: '30 hari', tier_id: 'premium-monthly', tier_name: 'Premium Bulanan', billing_period: 'custom', display_order: 100, active: true }]
  });
});

test('V342 rejects missing, malformed, empty catalogs and preserves the legacy single-plan guard', () => {
  for (const env of [{}, { MONETIZATION_PLANS_JSON: '{' }, { MONETIZATION_PLANS_JSON: '[]' }]) {
    assert.throws(() => getPlans(env), MonetizationError);
  }
  const multi = { MONETIZATION_PLANS_JSON: JSON.stringify([{ id: 'a1', name: 'A', amount: 1, duration_days: 1, active: true }, { id: 'b2', name: 'B', amount: 2, duration_days: 2, active: true }]) };
  assert.throws(() => getActivePlan(multi), (error) => error.code === 'MONETIZATION_PLAN_SELECTION_REQUIRED');
});

test('V341 rejects client-configured invalid prices and durations', () => {
  for (const plan of [
    { id: 'premium', name: 'Premium', amount: 0, duration_days: 30, active: true },
    { id: 'premium', name: 'Premium', amount: 100, duration_days: 0, active: true },
    { id: 'premium', name: 'Premium', amount: 100.5, duration_days: 30, active: true },
    { id: '../bad', name: 'Premium', amount: 100, duration_days: 30, active: true }
  ]) assert.throws(() => getPlans({ MONETIZATION_PLANS_JSON: JSON.stringify([plan]) }), MonetizationError);
});

test('V341 catalog does not mutate the configured source object', () => {
  const source = [{ id: 'premium', name: 'Premium', amount: 100, duration_days: 30, active: true, internal_note: 'secret' }];
  const result = getPublicCatalog({ MONETIZATION_PLANS_JSON: JSON.stringify(source) });
  assert.equal(result.plans[0].internal_note, undefined);
  assert.equal(source[0].internal_note, 'secret');
});

test('V341 extracts only a well-formed bearer token', () => {
  assert.equal(getBearerToken({ headers: { authorization: 'Bearer abc.def' } }), 'abc.def');
  assert.equal(getBearerToken({ headers: { Authorization: 'bearer token' } }), 'token');
  assert.equal(getBearerToken({ headers: { authorization: 'Basic abc' } }), '');
  assert.equal(getBearerToken({ headers: {} }), '');
});

test('V341 parses only JSON object request bodies', () => {
  assert.deepEqual(parseBody('{"plan_id":"premium"}'), { plan_id: 'premium' });
  assert.deepEqual(parseBody({ plan_id: 'premium' }), { plan_id: 'premium' });
  assert.equal(parseBody('[]'), null);
  assert.equal(parseBody('not json'), null);
  assert.equal(parseBody(null), null);
});

test('V341 validates a Supabase session through the Auth user endpoint', async () => {
  let calledUrl = '';
  const result = await requireSupabaseUser({ headers: { authorization: 'Bearer signed-user-token' } }, {
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' },
    fetchImpl: async (url, options) => {
      calledUrl = url;
      assert.equal(options.headers.Authorization, 'Bearer signed-user-token');
      assert.equal(options.headers.apikey, 'anon');
      return { ok: true, json: async () => ({ id: '123e4567-e89b-12d3-a456-426614174000', email: 'a@example.com' }) };
    }
  });
  assert.equal(calledUrl, 'https://example.supabase.co/auth/v1/user');
  assert.equal(result.user.email, 'a@example.com');
});

test('V341 rejects absent or invalid Supabase bearer sessions', async () => {
  await assert.rejects(() => requireSupabaseUser({ headers: {} }, { env: validEnv }), (error) => error.code === 'MONETIZATION_AUTH_REQUIRED');
  await assert.rejects(() => requireSupabaseUser({ headers: { authorization: 'Bearer bad' } }, {
    env: validEnv, fetchImpl: async () => ({ ok: false })
  }), (error) => error.code === 'MONETIZATION_AUTH_INVALID');
});

test('V341 generates unpredictable server-owned order identifiers', () => {
  const first = createOrderId();
  const second = createOrderId();
  assert.match(first, /^TPP-[A-Z0-9-]{12,80}$/);
  assert.notEqual(first, second);
});

test('V341 verifies Midtrans SHA-512 signatures and rejects tampering', () => {
  const serverKey = 'server-secret';
  const notification = { order_id: 'TPP-ORDER-123456', status_code: '200', gross_amount: '59000.00' };
  notification.signature_key = crypto.createHash('sha512').update(`${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`).digest('hex');
  assert.equal(verifyMidtransSignature(notification, serverKey), true);
  assert.equal(verifyMidtransSignature({ ...notification, gross_amount: '1.00' }, serverKey), false);
  assert.equal(verifyMidtransSignature({ ...notification, signature_key: 'invalid' }, serverKey), false);
  assert.equal(verifyMidtransSignature({}, serverKey), false);
});

test('V341 maps only confirmed settlement/capture to paid', () => {
  assert.equal(mapMidtransStatus('settlement'), 'paid');
  assert.equal(mapMidtransStatus('capture', 'accept'), 'paid');
  assert.equal(mapMidtransStatus('capture', 'challenge'), 'failed');
  assert.equal(mapMidtransStatus('pending'), 'pending');
  assert.equal(mapMidtransStatus('expire'), 'failed');
  assert.equal(mapMidtransStatus('cancel'), 'failed');
  assert.equal(mapMidtransStatus('refund'), 'refunded');
  assert.equal(mapMidtransStatus('partial_refund'), 'refunded');
  assert.equal(mapMidtransStatus('unknown'), 'pending');
});

test('V341 selects the correct Midtrans status API environment', () => {
  assert.equal(midtransBaseUrl(false), 'https://api.sandbox.midtrans.com');
  assert.equal(midtransBaseUrl(true), 'https://api.midtrans.com');
});

test('V341 uses the same public Supabase anon key as the existing app auth module', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../assets/js/auth-service.js', import.meta.url), 'utf8');
  const match = source.match(/const SUPABASE_ANON_KEY = '([^']+)'/);
  assert.ok(match);
  assert.equal(DEFAULT_SUPABASE_ANON_KEY, match[1]);
});

test('V341 frontend checkout sends a Supabase bearer token and plan id, never a client amount', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../assets/js/language-engine.js', import.meta.url), 'utf8');
  const start = source.indexOf('async function mulaiTransaksiMidtrans()');
  const end = source.indexOf('\n}\n\nwindow.filterDaftarBahasa', start);
  const checkout = source.slice(start, end);
  assert.match(checkout, /supabase\.auth\.getSession\(\)/);
  assert.match(checkout, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(checkout, /plan_id: plan\.id/);
  assert.doesNotMatch(checkout, /gross_amount\s*:/);
  assert.doesNotMatch(checkout, /50000/);
});

test('V341 SQL locks down direct client writes and grants activation RPC only to service_role', async () => {
  const { readFile } = await import('node:fs/promises');
  const sql = await readFile(new URL('../supabase/migrations/20261101_hybrid_monetization_v341.sql', import.meta.url), 'utf8');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.monetization_orders from public, anon, authenticated/i);
  assert.match(sql, /revoke all on function public\.confirm_monetization_payment[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.confirm_monetization_payment[\s\S]*to service_role/i);
  assert.match(sql, /source_order_id text not null unique/i);
  assert.match(sql, /if v_order\.status = 'refunded' then raise exception/i);
});

test('V341 API routes fail closed for unsupported methods and unauthenticated user data', async () => {
  const { default: createPaymentToken } = await import('../serverless/api/create-payment-token.js');
  const { default: paymentStatus } = await import('../serverless/api/payment-status.js');
  const { default: myEntitlements } = await import('../serverless/api/my-entitlements.js');
  const { default: notification } = await import('../serverless/api/midtrans-notification.js');
  const makeResponse = () => ({ headers: {}, statusCode: 200, payload: null,
    setHeader(key, value) { this.headers[key] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
    end() { return this; }
  });
  const req = { method: 'GET', headers: {}, query: {} };
  let res = makeResponse(); await createPaymentToken(req, res); assert.equal(res.statusCode, 405);
  res = makeResponse(); await notification(req, res); assert.equal(res.statusCode, 405);
  res = makeResponse(); await paymentStatus(req, res); assert.equal(res.statusCode, 401);
  res = makeResponse(); await myEntitlements(req, res); assert.equal(res.statusCode, 401);
});

test('V341 public catalog route returns only the configured active plan', async () => {
  const { default: catalogHandler } = await import('../serverless/api/monetization-catalog.js');
  const previous = process.env.MONETIZATION_PLANS_JSON;
  process.env.MONETIZATION_PLANS_JSON = validEnv.MONETIZATION_PLANS_JSON;
  const res = { statusCode: 200, payload: null, setHeader() { return this; }, status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; }, end() { return this; } };
  try {
    await catalogHandler({ method: 'GET' }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.plans[0].id, 'premium-monthly');
  } finally {
    if (previous === undefined) delete process.env.MONETIZATION_PLANS_JSON;
    else process.env.MONETIZATION_PLANS_JSON = previous;
  }
});


test('V342 catalog supports multiple active Lite and Pro monthly plans with server-owned metadata', () => {
  const env = { MONETIZATION_PLANS_JSON: JSON.stringify([
    { id: 'pro-monthly', name: 'Pro Bulanan', tier_id: 'pro', tier_name: 'Pro', billing_period: 'monthly', amount: 49900, duration_days: 30, display_order: 2, active: true },
    { id: 'lite-monthly', name: 'Lite Bulanan', tier_id: 'lite', tier_name: 'Lite', billing_period: 'monthly', amount: 19900, duration_days: 30, display_order: 1, active: true },
    { id: 'pro-annual-draft', name: 'Pro Tahunan Draft', tier_id: 'pro', tier_name: 'Pro', billing_period: 'annual', amount: 549000, duration_days: 365, display_order: 4, active: false }
  ]) };
  const catalog = getPublicCatalog(env);
  assert.deepEqual(catalog.plans.map((plan) => plan.id), ['lite-monthly', 'pro-monthly']);
  assert.equal(catalog.plans[0].amount, 19900);
  assert.equal(catalog.plans[1].amount, 49900);
  assert.equal(catalog.plans[1].billing_period, 'monthly');
  assert.equal(getPlanById('pro-monthly', env).tier_id, 'pro');
  assert.throws(() => getPlanById('pro-annual-draft', env), (error) => error.code === 'MONETIZATION_PLAN_UNAVAILABLE');
});

test('V342 rejects duplicate plan ids, invalid periods, and invalid display order', () => {
  const base = { id: 'lite-monthly', name: 'Lite', amount: 19900, duration_days: 30, active: true };
  for (const plans of [
    [base, { ...base, name: 'Duplicate' }],
    [{ ...base, billing_period: 'weekly' }],
    [{ ...base, display_order: -1 }],
    [{ ...base, tier_id: '../invalid' }]
  ]) assert.throws(() => getPlans({ MONETIZATION_PLANS_JSON: JSON.stringify(plans) }), MonetizationError);
});

test('V342 SQL snapshots plan metadata and serializes entitlement activation per user', async () => {
  const { readFile } = await import('node:fs/promises');
  const sql = await readFile(new URL('../supabase/migrations/20261102_membership_catalog_v342.sql', import.meta.url), 'utf8');
  assert.match(sql, /add column if not exists plan_name/i);
  assert.match(sql, /add column if not exists tier_id/i);
  assert.match(sql, /add column if not exists billing_period/i);
  assert.match(sql, /perform 1 from auth\.users where id = v_order\.user_id for update/i);
  assert.match(sql, /create trigger monetization_orders_fill_plan_snapshot/i);
  assert.match(sql, /new\.plan_name := new\.plan_id/i);
  assert.match(sql, /v_order\.plan_name, v_order\.tier_id/i);
  assert.match(sql, /grant execute on function public\.confirm_monetization_payment[\s\S]*to service_role/i);
});

test('V342 membership endpoint returns a normalized Free state when no active entitlement exists', async () => {
  const { default: myEntitlements } = await import('../serverless/api/my-entitlements.js');
  const previous = globalThis.fetch;
  const previousEnv = Object.fromEntries(['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].map((key) => [key, process.env[key]]));
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  const res = { statusCode: 200, payload: null, setHeader() { return this; }, status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; }, end() { return this; } };
  globalThis.fetch = async (url) => {
    if (String(url).includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: '123e4567-e89b-12d3-a456-426614174000' }) };
    return { ok: true, text: async () => '[]' };
  };
  try {
    await myEntitlements({ method: 'GET', headers: { authorization: 'Bearer test-session' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.is_premium, false);
    assert.deepEqual(res.payload.membership, { status: 'free', plan_id: 'free', plan_name: 'Free', tier_id: 'free', billing_period: 'none', starts_at: null, expires_at: null, days_remaining: 0 });
  } finally {
    globalThis.fetch = previous;
    for (const [key, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test('V342 checkout resolves the selected plan server-side and ignores client amount fields', async () => {
  const { default: createPaymentToken } = await import('../serverless/api/create-payment-token.js');
  const previousFetch = globalThis.fetch;
  const keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'MIDTRANS_SERVER_KEY', 'MIDTRANS_CLIENT_KEY', 'MIDTRANS_IS_PRODUCTION', 'MONETIZATION_PLANS_JSON'];
  const previousEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
    MIDTRANS_SERVER_KEY: 'midtrans-server-test', MIDTRANS_CLIENT_KEY: 'midtrans-client-test', MIDTRANS_IS_PRODUCTION: 'false',
    MONETIZATION_PLANS_JSON: JSON.stringify([
      { id: 'lite-monthly', name: 'Lite Bulanan', tier_id: 'lite', tier_name: 'Lite', billing_period: 'monthly', amount: 19900, duration_days: 30, active: true, display_order: 1 },
      { id: 'pro-monthly', name: 'Pro Bulanan', tier_id: 'pro', tier_name: 'Pro', billing_period: 'monthly', amount: 49900, duration_days: 30, active: true, display_order: 2 }
    ])
  });
  let orderPayload = null;
  let gatewayPayload = null;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith('/auth/v1/user')) return { ok: true, json: async () => ({ id: '123e4567-e89b-12d3-a456-426614174000', email: 'test@example.com' }) };
    if (String(url).includes('/rest/v1/monetization_orders')) {
      orderPayload = JSON.parse(options.body);
      return { ok: true, text: async () => '' };
    }
    if (String(url).includes('/snap/v1/transactions')) {
      gatewayPayload = JSON.parse(options.body);
      return { ok: true, json: async () => ({ token: 'snap-token', redirect_url: 'https://example.test/pay' }) };
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };
  const res = { statusCode: 200, payload: null, headers: {}, setHeader(key, value) { this.headers[key] = value; return this; }, status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; }, end() { return this; } };
  try {
    await createPaymentToken({ method: 'POST', headers: { authorization: 'Bearer valid-session' }, body: { plan_id: 'pro-monthly', amount: 1, gross_amount: 1 } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(orderPayload.amount, 49900);
    assert.equal(orderPayload.plan_id, 'pro-monthly');
    assert.equal(orderPayload.tier_id, 'pro');
    assert.equal(gatewayPayload.transaction_details.gross_amount, 49900);
    assert.equal(gatewayPayload.item_details[0].price, 49900);
    assert.equal(res.payload.amount, 49900);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
