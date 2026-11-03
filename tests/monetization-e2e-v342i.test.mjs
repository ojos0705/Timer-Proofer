/** [AI-GENERATED][QA][V342-I] Offline integration coverage for the monetization lifecycle. */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const SERVER_KEY = 'stage-i-server-secret';
const PLAN = { id: 'lite-monthly', name: 'Lite Bulanan', amount: 19900, duration_days: 30, tier_id: 'lite', tier_name: 'Lite', billing_period: 'monthly', active: true };
const ENV = {
  SUPABASE_URL: 'https://unit-test.supabase.co', SUPABASE_ANON_KEY: 'anon-test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test', MIDTRANS_SERVER_KEY: SERVER_KEY,
  MIDTRANS_CLIENT_KEY: 'SB-Mid-client-test', MIDTRANS_IS_PRODUCTION: 'false',
  MONETIZATION_PLANS_JSON: JSON.stringify([PLAN]),
  FEATURE_QUOTAS_JSON: JSON.stringify({
    free: { ai_analysis: { limit: 2 }, ai_tips: { limit: 3 }, cloud_translation: { limit: 5 } },
    lite: { ai_analysis: { limit: 20 }, ai_tips: { limit: 30 }, cloud_translation: { limit: 50 } },
    pro: { ai_analysis: { limit: null }, ai_tips: { limit: null }, cloud_translation: { limit: null } }
  })
};

function response(status, body = null) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' }
  });
}
function makeRes() {
  return { headers: {}, statusCode: 200, payload: null,
    setHeader(k, v) { this.headers[k] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
    end() { return this; }
  };
}
function signedNotification(orderId, amount = '19900.00', statusCode = '200') {
  return {
    order_id: orderId, gross_amount: amount, status_code: statusCode,
    signature_key: crypto.createHash('sha512').update(`${orderId}${statusCode}${amount}${SERVER_KEY}`).digest('hex')
  };
}
async function withEnvAndFetch(env, fetchImpl, run) {
  const oldFetch = globalThis.fetch;
  const oldEnv = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  globalThis.fetch = fetchImpl;
  try { await run(); }
  finally {
    globalThis.fetch = oldFetch;
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

const authRoute = (url) => url.endsWith('/auth/v1/user');
const restRoute = (url) => url.includes('/rest/v1/');

test('Stage I checkout creates a server-priced order and Snap token without leaking secrets', async () => {
  const { default: handler } = await import('../serverless/api/create-payment-token.js');
  const calls = [];
  await withEnvAndFetch(ENV, async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (authRoute(String(url))) return response(200, { id: USER_ID, email: 'user@example.test' });
    if (String(url).includes('/rest/v1/monetization_orders')) return response(201, []);
    if (String(url).includes('/snap/v1/transactions')) return response(201, { token: 'snap-token-test', redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/test' });
    return response(404, {});
  }, async () => {
    const req = { method: 'POST', headers: { authorization: 'Bearer user-session' }, body: { plan_id: PLAN.id, amount: 1, gross_amount: 1 } };
    const res = makeRes(); await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.token, 'snap-token-test');
    assert.equal(res.payload.amount, PLAN.amount);
    assert.equal(res.payload.plan.tier_id, 'lite');
    assert.equal(JSON.stringify(res.payload).includes(SERVER_KEY), false);
    const insert = calls.find((call) => call.url.includes('/rest/v1/monetization_orders'));
    const order = JSON.parse(insert.options.body);
    assert.equal(order.user_id, USER_ID);
    assert.equal(order.amount, PLAN.amount);
    assert.equal(order.status, 'pending');
    const gateway = calls.find((call) => call.url.includes('/snap/v1/transactions'));
    const gatewayBody = JSON.parse(gateway.options.body);
    assert.equal(gatewayBody.transaction_details.gross_amount, PLAN.amount);
    assert.equal(gateway.options.headers.Authorization, `Basic ${Buffer.from(`${SERVER_KEY}:`).toString('base64')}`);
  });
});

test('Stage I checkout rejects unavailable plans before creating an order or contacting Midtrans', async () => {
  const { default: handler } = await import('../serverless/api/create-payment-token.js');
  const calls = [];
  await withEnvAndFetch(ENV, async (url) => {
    calls.push(String(url));
    if (authRoute(String(url))) return response(200, { id: USER_ID });
    return response(500, {});
  }, async () => {
    const res = makeRes(); await handler({ method: 'POST', headers: { authorization: 'Bearer user-session' }, body: { plan_id: 'admin-provided-price' } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.payload.code, 'MONETIZATION_PLAN_UNAVAILABLE');
    assert.equal(calls.filter((url) => restRoute(url) || url.includes('midtrans')).length, 0);
  });
});

test('Stage I notification rejects forged signatures before provider or database access', async () => {
  const { default: handler } = await import('../serverless/api/midtrans-notification.js');
  let calls = 0;
  await withEnvAndFetch(ENV, async () => { calls += 1; return response(500, {}); }, async () => {
    const res = makeRes(); await handler({ method: 'POST', body: { ...signedNotification('TPP-ORDER-123456'), signature_key: '00' } }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.payload.code, 'MONETIZATION_INVALID_SIGNATURE');
    assert.equal(calls, 0);
  });
});

test('Stage I paid notification verifies provider facts and calls activation RPC exactly once', async () => {
  const { default: handler } = await import('../serverless/api/midtrans-notification.js');
  const orderId = 'TPP-ORDER-123456'; const calls = [];
  await withEnvAndFetch(ENV, async (url, options = {}) => {
    const target = String(url); calls.push({ target, options });
    if (target.includes('/v2/') && target.endsWith('/status')) return response(200, {
      order_id: orderId, gross_amount: '19900.00', currency: 'IDR', transaction_status: 'settlement',
      fraud_status: 'accept', transaction_id: 'midtrans-tx-1', settlement_time: '2026-11-02 10:00:00'
    });
    if (target.includes('/rest/v1/monetization_orders?')) return response(200, [{ order_id: orderId, amount: 19900, currency: 'IDR', user_id: USER_ID, status: 'pending' }]);
    if (target.includes('/rest/v1/rpc/confirm_monetization_payment')) return response(200, { activated: true, idempotent: false });
    return response(404, {});
  }, async () => {
    const res = makeRes(); await handler({ method: 'POST', body: signedNotification(orderId) }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.status, 'paid');
    const activationCalls = calls.filter((call) => call.target.includes('/rpc/confirm_monetization_payment'));
    assert.equal(activationCalls.length, 1);
    const rpcBody = JSON.parse(activationCalls[0].options.body);
    assert.equal(rpcBody.p_order_id, orderId);
    assert.equal(rpcBody.p_provider_transaction_id, 'midtrans-tx-1');
    assert.equal(rpcBody.p_provider_status, 'settlement');
    assert.equal(calls.some((call) => call.target.includes('/rpc/revoke_monetization_entitlement')), false);
  });
});

test('Stage I pending notification updates order only and never activates entitlement', async () => {
  const { default: handler } = await import('../serverless/api/midtrans-notification.js');
  const orderId = 'TPP-ORDER-123456'; const calls = [];
  await withEnvAndFetch(ENV, async (url, options = {}) => {
    const target = String(url); calls.push({ target, options });
    if (target.includes('/v2/') && target.endsWith('/status')) return response(200, { order_id: orderId, gross_amount: '19900.00', currency: 'IDR', transaction_status: 'pending', transaction_id: 'midtrans-tx-pending' });
    if (target.includes('/rest/v1/monetization_orders?select=')) return response(200, [{ order_id: orderId, amount: 19900, currency: 'IDR', user_id: USER_ID, status: 'pending' }]);
    if (target.includes('/rest/v1/monetization_orders?order_id=')) return response(200, []);
    return response(404, {});
  }, async () => {
    const res = makeRes(); await handler({ method: 'POST', body: signedNotification(orderId) }, res);
    assert.equal(res.statusCode, 200); assert.equal(res.payload.status, 'pending');
    assert.equal(calls.some((call) => call.target.includes('/rpc/confirm_monetization_payment')), false);
    assert.equal(calls.some((call) => call.target.includes('/rpc/revoke_monetization_entitlement')), false);
    const patch = calls.find((call) => call.options.method === 'PATCH');
    assert.equal(JSON.parse(patch.options.body).status, 'pending');
  });
});

test('Stage I notification rejects amount/currency mismatch and never activates access', async () => {
  const { default: handler } = await import('../serverless/api/midtrans-notification.js');
  const orderId = 'TPP-ORDER-123456'; let activated = false;
  await withEnvAndFetch(ENV, async (url) => {
    const target = String(url);
    if (target.includes('/v2/') && target.endsWith('/status')) return response(200, { order_id: orderId, gross_amount: '19900.00', currency: 'USD', transaction_status: 'settlement', transaction_id: 'tx-1' });
    if (target.includes('/rest/v1/monetization_orders?')) return response(200, [{ order_id: orderId, amount: 19900, currency: 'IDR', user_id: USER_ID, status: 'pending' }]);
    if (target.includes('/rpc/confirm_monetization_payment')) activated = true;
    return response(200, []);
  }, async () => {
    const res = makeRes(); await handler({ method: 'POST', body: signedNotification(orderId) }, res);
    assert.equal(res.statusCode, 400); assert.equal(res.payload.code, 'MONETIZATION_ORDER_AMOUNT_MISMATCH'); assert.equal(activated, false);
  });
});

test('Stage I refunded notification revokes entitlement only after provider status verification', async () => {
  const { default: handler } = await import('../serverless/api/midtrans-notification.js');
  const orderId = 'TPP-ORDER-123456'; const calls = [];
  await withEnvAndFetch(ENV, async (url, options = {}) => {
    const target = String(url); calls.push({ target, options });
    if (target.includes('/v2/') && target.endsWith('/status')) return response(200, { order_id: orderId, gross_amount: '19900.00', currency: 'IDR', transaction_status: 'refund', transaction_id: 'tx-1' });
    if (target.includes('/rest/v1/monetization_orders?select=')) return response(200, [{ order_id: orderId, amount: 19900, currency: 'IDR', user_id: USER_ID, status: 'paid' }]);
    if (target.includes('/rest/v1/monetization_orders?order_id=')) return response(200, []);
    if (target.includes('/rpc/revoke_monetization_entitlement')) return response(200, { revoked: true });
    return response(404, {});
  }, async () => {
    const res = makeRes(); await handler({ method: 'POST', body: signedNotification(orderId) }, res);
    assert.equal(res.statusCode, 200); assert.equal(res.payload.status, 'refunded');
    assert.equal(calls.filter((call) => call.target.includes('/rpc/revoke_monetization_entitlement')).length, 1);
    assert.equal(calls.some((call) => call.target.includes('/rpc/confirm_monetization_payment')), false);
  });
});

test('Stage I payment status and entitlements queries are constrained to the authenticated user', async () => {
  const { default: paymentStatus } = await import('../serverless/api/payment-status.js');
  const { default: entitlements } = await import('../serverless/api/my-entitlements.js');
  const seen = [];
  await withEnvAndFetch(ENV, async (url) => {
    const target = String(url); seen.push(target);
    if (authRoute(target)) return response(200, { id: USER_ID });
    if (target.includes('/monetization_orders?')) return response(200, [{ order_id: 'TPP-ORDER-123456', user_id: USER_ID, status: 'paid' }]);
    if (target.includes('/user_entitlements?')) return response(200, []);
    return response(404, {});
  }, async () => {
    const statusRes = makeRes(); await paymentStatus({ method: 'GET', headers: { authorization: 'Bearer user-session' }, query: { order_id: 'TPP-ORDER-123456' } }, statusRes);
    assert.equal(statusRes.statusCode, 200);
    const entitlementRes = makeRes(); await entitlements({ method: 'GET', headers: { authorization: 'Bearer user-session' } }, entitlementRes);
    assert.equal(entitlementRes.statusCode, 200);
    assert.ok(seen.some((url) => url.includes(`user_id=eq.${USER_ID}`)));
    assert.equal(entitlementRes.payload.is_premium, false);
    assert.equal(entitlementRes.payload.membership.tier_id, 'free');
  });
});

test('Stage I trial endpoint delegates eligibility and duration to the fixed seven-day database RPC', async () => {
  const { default: handler } = await import('../serverless/api/start-free-trial.js');
  let rpcBody;
  await withEnvAndFetch(ENV, async (url, options = {}) => {
    const target = String(url);
    if (authRoute(target)) return response(200, { id: USER_ID });
    if (target.includes('/rpc/start_free_trial')) { rpcBody = JSON.parse(options.body); return response(200, { started: true, duration_days: 7, auto_renew: false, payment_method_required: false }); }
    return response(404, {});
  }, async () => {
    const res = makeRes(); await handler({ method: 'POST', headers: { authorization: 'Bearer user-session' }, body: { duration_days: 365, amount: 0 } }, res);
    assert.equal(res.statusCode, 200); assert.equal(rpcBody.p_user_id, USER_ID); assert.equal(rpcBody.p_duration_days, 7);
    assert.equal(res.payload.trial.auto_renew, false); assert.equal(res.payload.trial.payment_method_required, false);
  });
});

test('Stage I quota configuration validates all independent feature/tier limits', async () => {
  const { parseFeatureQuotaConfig, consumeFeatureQuota } = await import('../serverless/api/feature-access-utils.js');
  assert.deepEqual(parseFeatureQuotaConfig(ENV).pro.ai_analysis, { limit: null });
  assert.throws(() => parseFeatureQuotaConfig({ FEATURE_QUOTAS_JSON: JSON.stringify({ free: {}, lite: {}, pro: {} }) }), { code: 'FEATURE_QUOTAS_CONFIG_INVALID' });
  let rpcBody;
  await withEnvAndFetch(ENV, async (url, options = {}) => {
    if (String(url).includes('/rpc/consume_feature_quota')) { rpcBody = JSON.parse(options.body); return response(200, { allowed: true, tier: 'free', limit: 2, used: 1, remaining: 1, unlimited: false }); }
    return response(404, {});
  }, async () => {
    const result = await consumeFeatureQuota(USER_ID, 'ai_analysis', ENV);
    assert.equal(result.allowed, true); assert.equal(rpcBody.p_user_id, USER_ID); assert.equal(rpcBody.p_feature_id, 'ai_analysis');
  });
  await assert.rejects(() => consumeFeatureQuota(USER_ID, 'unknown_feature', ENV), { code: 'FEATURE_UNKNOWN' });
});

test('Stage I database migrations keep order, entitlement, trial, and quota writes server-only', async () => {
  const { readFile } = await import('node:fs/promises');
  const root = new URL('../supabase/migrations/', import.meta.url);
  const files = [
    '20261101_hybrid_monetization_v341.sql',
    '20261102_feature_access_and_free_trial_v342d.sql',
    '20261102_finance_ledger_v342f.sql',
    '20261102_midtrans_reconciliation_v342g.sql',
    '20261102_payout_fee_import_v342h.sql'
  ];
  for (const file of files) {
    const sql = await readFile(new URL(file, root), 'utf8');
    assert.match(sql, /enable row level security/i, `${file} should enable RLS`);
    assert.match(sql, /revoke all on table[\s\S]*from public, anon, authenticated/i, `${file} should revoke client writes`);
  }
  const trialSql = await readFile(new URL(files[1], root), 'utf8');
  assert.match(trialSql, /unique references auth\.users\(id\)/i);
  assert.match(trialSql, /p_duration_days is distinct from 7/i);
  assert.match(trialSql, /on conflict \(user_id, feature_id, usage_date\)/i);
  assert.match(trialSql, /where public\.feature_usage_daily\.used_count < v_limit/i);
});

test('Stage I frontend does not treat Snap browser callback as authoritative payment confirmation', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../assets/js/language-engine.js', import.meta.url), 'utf8');
  const checkout = source.slice(source.indexOf('async function mulaiTransaksiMidtrans()'), source.indexOf('\n}\n\nwindow.filterDaftarBahasa'));
  assert.match(checkout, /midtransSnap\.pay\(data\.token/);
  assert.match(checkout, /payment-status|my-entitlements|status pembayaran|verifikasi/i);
  assert.doesNotMatch(checkout, /snapResult\.transaction_status\s*===\s*['"]settlement['"][\s\S]{0,180}grant/i);
});

test('Stage I provider failure and challenge statuses never activate paid entitlements', async (t) => {
  const { default: handler } = await import('../serverless/api/midtrans-notification.js');
  for (const scenario of [
    { label: 'deny', transaction_status: 'deny', fraud_status: 'deny', expected: 'failed' },
    { label: 'capture challenge', transaction_status: 'capture', fraud_status: 'challenge', expected: 'failed' },
    { label: 'expire', transaction_status: 'expire', fraud_status: '', expected: 'failed' }
  ]) {
    await t.test(scenario.label, async () => {
      const orderId = 'TPP-ORDER-123456'; const calls = [];
      await withEnvAndFetch(ENV, async (url, options = {}) => {
        const target = String(url); calls.push({ target, options });
        if (target.includes('/v2/') && target.endsWith('/status')) return response(200, {
          order_id: orderId, gross_amount: '19900.00', currency: 'IDR',
          transaction_status: scenario.transaction_status, fraud_status: scenario.fraud_status, transaction_id: 'tx-failed'
        });
        if (target.includes('/rest/v1/monetization_orders?select=')) return response(200, [{ order_id: orderId, amount: 19900, currency: 'IDR', user_id: USER_ID, status: 'pending' }]);
        if (target.includes('/rest/v1/monetization_orders?order_id=')) return response(200, []);
        return response(200, []);
      }, async () => {
        const res = makeRes(); await handler({ method: 'POST', body: signedNotification(orderId) }, res);
        assert.equal(res.statusCode, 200); assert.equal(res.payload.status, scenario.expected);
        assert.equal(calls.some((call) => call.target.includes('/rpc/confirm_monetization_payment')), false);
      });
    });
  }
});

test('Stage I rejects provider status responses for a different order identity', async () => {
  const { default: handler } = await import('../serverless/api/midtrans-notification.js');
  const orderId = 'TPP-ORDER-123456'; let orderLookup = false;
  await withEnvAndFetch(ENV, async (url) => {
    const target = String(url);
    if (target.includes('/v2/') && target.endsWith('/status')) return response(200, { order_id: 'TPP-OTHER-123456', gross_amount: '19900.00', currency: 'IDR', transaction_status: 'settlement' });
    if (target.includes('/rest/v1/monetization_orders?')) orderLookup = true;
    return response(200, []);
  }, async () => {
    const res = makeRes(); await handler({ method: 'POST', body: signedNotification(orderId) }, res);
    assert.equal(res.statusCode, 502); assert.equal(res.payload.code, 'MONETIZATION_STATUS_UNVERIFIED'); assert.equal(orderLookup, false);
  });
});
