import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizePayoutRow } from '../api/finance-payout-import.js';
const migration = fs.readFileSync(new URL('../supabase/migrations/20261102_payout_fee_import_v342h.sql', import.meta.url), 'utf8');
const dashboard = fs.readFileSync(new URL('../www/admin-finance.html', import.meta.url), 'utf8');

test('payout row normalizes an actual IDR fee and creates a deterministic idempotency hash', () => {
  const row = { order_id: 'TPP-ABC-123', fee_amount_idr: 1500, gross_amount_idr: 49900, fee_category: 'payment_fee', payout_reference: 'batch-1', source_reference: 'file.csv:2', occurred_at: '2026-11-02T10:00:00Z' };
  const a = normalizePayoutRow(row), b = normalizePayoutRow(row);
  assert.equal(a.amount_idr, 1500); assert.equal(a.currency, 'IDR'); assert.equal(a.source_row_hash, b.source_row_hash);
});
test('payout row accepts unallocated rows only when a report reference exists', () => {
  assert.equal(normalizePayoutRow({ fee_amount_idr: 250, payout_reference: 'payout-1', occurred_at: '2026-11-02T10:00:00Z' }).order_id, null);
  assert.throws(() => normalizePayoutRow({ fee_amount_idr: 250, occurred_at: '2026-11-02T10:00:00Z' }), /referensi/i);
});
test('payout row rejects unsafe IDs, invalid amounts, unsupported currency and category', () => {
  assert.throws(() => normalizePayoutRow({ order_id: 'x),tier_id.eq.pro', fee_amount_idr: 1 }), /tidak valid/i);
  assert.throws(() => normalizePayoutRow({ order_id: 'TP-1', fee_amount_idr: -1, occurred_at: '2026-11-02T10:00:00Z' }), /tidak valid/i);
  assert.throws(() => normalizePayoutRow({ order_id: 'TP-1', fee_amount_idr: 1, currency: 'USD', occurred_at: '2026-11-02T10:00:00Z' }), /IDR/i);
  assert.throws(() => normalizePayoutRow({ order_id: 'TP-1', fee_amount_idr: 1, fee_category: 'commission', occurred_at: '2026-11-02T10:00:00Z' }), /tidak valid/i);
});
test('payout import ledger is private, service-role-only, and idempotent', () => {
  assert.match(migration, /source_row_hash text not null unique/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.monetization_payout_fee_entries from public, anon, authenticated/i);
  const api = fs.readFileSync(new URL('../api/finance-payout-import.js', import.meta.url), 'utf8');
  assert.match(api, /getFinanceAdminIds/); assert.match(api, /resolution=ignore-duplicates/); assert.match(api, /on_conflict=source_row_hash/);
  assert.doesNotMatch(api, /MIDTRANS_SERVER_KEY|console\.log/);
});
test('finance dashboard exposes CSV import and labels unmatched rows as unallocated', () => {
  assert.match(dashboard, /id="payoutFile"/); assert.match(dashboard, /\/api\/finance-payout-import/);
  assert.match(dashboard, /belum teralokasi/); assert.match(dashboard, /XLSX belum didukung/);
});
test('payout import denies non-finance users before database access', async () => {
  const { default: handler } = await import('../api/finance-payout-import.js');
  const previousFetch = globalThis.fetch, previousAllowlist = process.env.FINANCE_ADMIN_USER_IDS; let databaseCalls = 0;
  globalThis.fetch = async (url) => { if (String(url).includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: '11111111-1111-4111-8111-111111111111' }) }; databaseCalls++; throw new Error('unexpected database access'); };
  process.env.FINANCE_ADMIN_USER_IDS = '22222222-2222-4222-8222-222222222222';
  const response = { headers:{},statusCode:200,body:null,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;},end(){return this;} };
  try { await handler({ method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({rows:[{order_id:'TP-1',fee_amount_idr:1,occurred_at:'2026-11-02T10:00:00Z'}]}) },response); assert.equal(response.statusCode,403);assert.equal(response.body.code,'FINANCE_ADMIN_REQUIRED');assert.equal(databaseCalls,0); }
  finally { globalThis.fetch=previousFetch;if(previousAllowlist===undefined)delete process.env.FINANCE_ADMIN_USER_IDS;else process.env.FINANCE_ADMIN_USER_IDS=previousAllowlist; }
});

test('CSV parsing supports quoted commas and escaped quotes', async () => {
  const { parsePayoutCsv } = await import('../assets/js/finance-payout-csv.js');
  assert.deepEqual(parsePayoutCsv('Order ID,Description,Fee\nTP-1,"Fee, MDR","1,500"\n'), [['Order ID','Description','Fee'],['TP-1','Fee, MDR','1,500']]);
  assert.deepEqual(parsePayoutCsv('A,B\n"x""y",z'), [['A','B'], ['x"y','z']]);
  assert.throws(() => parsePayoutCsv('A,B\n"broken,z'), /kutip/i);
});
test('IDR parser accepts Indonesian and international thousands separators without inflating decimals', async () => {
  const { parsePayoutIDR } = await import('../assets/js/finance-payout-csv.js');
  assert.equal(parsePayoutIDR('Rp 1.500'), 1500);
  assert.equal(parsePayoutIDR('1.500,00'), 1500);
  assert.equal(parsePayoutIDR('1,500.00'), 1500);
  assert.equal(parsePayoutIDR('1500.00'), 1500);
  assert.equal(parsePayoutIDR('-1.500'), null);
  assert.equal(parsePayoutIDR('1.500,50'), null);
});
test('payout date parser interprets Indonesian DD/MM/YYYY in WIB and rejects impossible dates', async () => {
  const { parsePayoutDate } = await import('../assets/js/finance-payout-csv.js');
  assert.equal(parsePayoutDate('02/11/2026 14:30:00'), '2026-11-02T07:30:00.000Z');
  assert.equal(parsePayoutDate('31/02/2026'), null);
  assert.equal(parsePayoutDate(''), null);
});
