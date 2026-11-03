import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getFinanceAdminIds, summarizeFinanceOrders, summarizeFinanceAdjustments } from '../api/finance-admin-summary.js';

const migration = fs.readFileSync(new URL('../supabase/migrations/20261102_finance_ledger_v342f.sql', import.meta.url), 'utf8');
const dashboard = fs.readFileSync(new URL('../www/admin-finance.html', import.meta.url), 'utf8');

test('finance admin allowlist accepts only UUID entries and is separate from AI allowlist', () => {
  const ids = getFinanceAdminIds({ FINANCE_ADMIN_USER_IDS: '11111111-1111-4111-8111-111111111111, bad, 22222222-2222-4222-8222-222222222222' });
  assert.equal(ids.size, 2);
  assert.equal(ids.has('11111111-1111-4111-8111-111111111111'), true);
  assert.equal(getFinanceAdminIds({ AI_COST_ADMIN_USER_IDS: '11111111-1111-4111-8111-111111111111' }).size, 0);
});

test('finance order summary distinguishes paid, pending, failed, and refunded gross exposure', () => {
  const result = summarizeFinanceOrders([
    { status: 'paid', amount: 19900 }, { status: 'pending', amount: 49900 },
    { status: 'failed', amount: 19900 }, { status: 'refunded', amount: 49900 },
    { status: 'paid', amount: 'invalid' }
  ]);
  assert.deepEqual(result, { paid_orders: 1, pending_orders: 1, failed_orders: 1, refunded_orders: 1,
    paid_gross_idr: 19900, refunded_order_gross_idr: 49900, pending_gross_idr: 49900 });
});

test('finance adjustment summary keeps actual and estimated amounts distinct', () => {
  const result = summarizeFinanceAdjustments([
    { category: 'payment_fee', amount_idr: 1500, evidence_level: 'actual' },
    { category: 'infrastructure', amount_idr: 2000, evidence_level: 'estimated' }
  ]);
  assert.equal(result.total_recorded_cost_idr, 3500);
  assert.deepEqual(result.by_evidence_level_idr, { actual: 1500, estimated: 2000 });
});

test('finance ledger is private, append-only at API surface, and validates source evidence', () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.monetization_finance_adjustments from public, anon, authenticated/i);
  assert.match(migration, /evidence_level text not null check.*actual.*estimated/s);
  assert.match(migration, /reference text not null/i);
  assert.doesNotMatch(migration, /create policy/i);
  const api = fs.readFileSync(new URL('../api/finance-admin-summary.js', import.meta.url), 'utf8');
  assert.match(api, /FINANCE_ADMIN_USER_IDS/);
  assert.match(api, /method === 'POST'/);
  assert.match(api, /created_by: user\.id/);
  assert.doesNotMatch(api, /AI_COST_ADMIN_USER_IDS/);
});

test('standalone dashboard uses authenticated session and labels the balance as indicative', () => {
  assert.match(dashboard, /AuthService\.getSession\(\)/);
  assert.match(dashboard, /Authorization:`Bearer \$\{session\.access_token\}`/);
  assert.match(dashboard, /Saldo operasional indikatif/);
  assert.match(dashboard, /bukan laba bersih/);
  assert.match(dashboard, /noindex,nofollow/);
});

test('finance endpoint denies authenticated users outside the finance allowlist before database access', async () => {
  const { default: handler } = await import('../api/finance-admin-summary.js');
  const previousFetch = globalThis.fetch;
  const previousAllowlist = process.env.FINANCE_ADMIN_USER_IDS;
  let databaseTouched = false;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/auth/v1/user')) {
      return { ok: true, json: async () => ({ id: '11111111-1111-4111-8111-111111111111' }) };
    }
    databaseTouched = true;
    throw new Error('Database must not be accessed for a denied user');
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
    await handler({ method: 'GET', headers: { authorization: 'Bearer test-session' }, query: { days: '30' } }, response);
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.code, 'FINANCE_ADMIN_REQUIRED');
    assert.equal(databaseTouched, false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousAllowlist === undefined) delete process.env.FINANCE_ADMIN_USER_IDS;
    else process.env.FINANCE_ADMIN_USER_IDS = previousAllowlist;
  }
});
