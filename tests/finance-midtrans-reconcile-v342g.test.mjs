import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeMidtransReconciliation } from '../serverless/api/finance-midtrans-reconcile.js';
import { summarizeAICostByTier, summarizeTierReconciliation } from '../serverless/api/finance-reconciliation-utils.js';

const migration = fs.readFileSync(new URL('../supabase/migrations/20261102_midtrans_reconciliation_v342g.sql', import.meta.url), 'utf8');
const dashboard = fs.readFileSync(new URL('../www/admin-finance.html', import.meta.url), 'utf8');

test('Midtrans snapshot validates order identity, currency, and exact gross amount', () => {
  const order = { order_id: 'TP-001', amount: 49900 };
  assert.throws(() => normalizeMidtransReconciliation(order, { order_id: 'TP-OTHER', gross_amount: '49900.00' }), /Order ID/);
  assert.throws(() => normalizeMidtransReconciliation(order, { order_id: 'TP-001', gross_amount: '39900.00' }), /Nominal/);
  assert.throws(() => normalizeMidtransReconciliation(order, { order_id: 'TP-001', gross_amount: '49900.00', currency: 'USD' }), /Nominal/);
});

test('refund snapshots distinguish Midtrans acknowledged amount from bank-confirmed amount', () => {
  const snapshot = normalizeMidtransReconciliation({ order_id: 'TP-002', amount: 49900 }, {
    order_id: 'TP-002', gross_amount: '49900.00', transaction_status: 'partial_refund',
    refund_amount: '15000.00', refunds: [
      { refund_amount: '5000.00', refund_key: 'r1', bank_confirmed_at: '2026-11-01 10:00:00' },
      { refund_amount: '10000.00', refund_key: 'r2' }
    ]
  });
  assert.equal(snapshot.refund_amount_idr, 15000);
  assert.equal(snapshot.bank_confirmed_refund_amount_idr, 5000);
  assert.equal(snapshot.refund_details.length, 2);
});

test('refund values greater than transaction gross are rejected', () => {
  assert.throws(() => normalizeMidtransReconciliation({ order_id: 'TP-003', amount: 10000 }, {
    order_id: 'TP-003', gross_amount: '10000.00', refund_amount: '12000.00'
  }), /refund/i);
});

test('tier reconciliation counts settlement only and keeps confirmed refund separate', () => {
  const result = summarizeTierReconciliation([
    { order_id: 'a', tier_id: 'lite', amount: 19900, status: 'paid' },
    { order_id: 'b', tier_id: 'pro', amount: 49900, status: 'refunded' }
  ], [
    { order_id: 'a', provider_status: 'settlement', gross_amount_idr: 19900, refund_amount_idr: 0, bank_confirmed_refund_amount_idr: 0 },
    { order_id: 'b', provider_status: 'refund', gross_amount_idr: 49900, refund_amount_idr: 49900, bank_confirmed_refund_amount_idr: 49900 }
  ]);
  assert.equal(result.lite.settled_gross_idr, 19900);
  assert.equal(result.pro.settled_gross_idr, 49900);
  assert.equal(result.pro.bank_confirmed_refunds_idr, 49900);
  assert.equal(result.pro.unverified_orders, 0);
});

test('AI cost tier aggregation does not invent costs for unpriced events', () => {
  const result = summarizeAICostByTier([
    { tier_id: 'lite', estimated_cost_idr: 1000 },
    { tier_id: 'lite', estimated_cost_idr: null },
    { tier_id: 'pro', estimated_cost_idr: 2500 }
  ]);
  assert.deepEqual(result.lite, { estimated_cost_idr: 1000, priced_events: 1, unpriced_events: 1 });
  assert.equal(result.pro.estimated_cost_idr, 2500);
});

test('reconciliation snapshots are private and idempotently keyed by order', () => {
  assert.match(migration, /order_id text primary key references public\.monetization_orders/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.monetization_provider_reconciliations from public, anon, authenticated/i);
  assert.match(migration, /refund_details jsonb/i);
  const api = fs.readFileSync(new URL('../serverless/api/finance-midtrans-reconcile.js', import.meta.url), 'utf8');
  assert.match(api, /getFinanceAdminIds/);
  const adminApi = fs.readFileSync(new URL('../serverless/api/finance-admin-summary.js', import.meta.url), 'utf8');
  assert.match(adminApi, /FINANCE_ADMIN_USER_IDS/);
  assert.match(api, /on_conflict=order_id/);
  assert.match(api, /MIDTRANS_SERVER_KEY/);
  assert.doesNotMatch(api, /console\.log\(.*serverKey/i);
});

test('admin finance dashboard exposes explicit Midtrans reconciliation and tier cost caveats', () => {
  assert.match(dashboard, /id="syncMidtrans"/);
  assert.match(dashboard, /\/api\/finance-midtrans-reconcile/);
  assert.match(dashboard, /Rekonsiliasi per paket/);
  assert.match(dashboard, /Biaya AI tetap estimasi/);
  assert.match(dashboard, /MDR dan biaya payout/);
});

test('Midtrans reconciliation denies non-finance users before order or provider access', async () => {
  const { default: handler } = await import('../serverless/api/finance-midtrans-reconcile.js');
  const previousFetch = globalThis.fetch;
  const previousAllowlist = process.env.FINANCE_ADMIN_USER_IDS;
  let nonAuthFetchCount = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/auth/v1/user')) {
      return { ok: true, json: async () => ({ id: '11111111-1111-4111-8111-111111111111' }) };
    }
    nonAuthFetchCount++;
    throw new Error('Provider/database must not be called for a denied user');
  };
  process.env.FINANCE_ADMIN_USER_IDS = '22222222-2222-4222-8222-222222222222';
  const response = {
    headers: {}, statusCode: 200, body: null,
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; }
  };
  try {
    await handler({ method: 'POST', headers: { authorization: 'Bearer test-session' }, query: { days: '30' }, body: '{}' }, response);
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.code, 'FINANCE_ADMIN_REQUIRED');
    assert.equal(nonAuthFetchCount, 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousAllowlist === undefined) delete process.env.FINANCE_ADMIN_USER_IDS;
    else process.env.FINANCE_ADMIN_USER_IDS = previousAllowlist;
  }
});
