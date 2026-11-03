/** [AI-GENERATED][FINANCE][V342-H] Admin-only, idempotent Midtrans payout fee import. */
import crypto from 'node:crypto';
import { jsonResponse, MonetizationError, parseBody, requireSupabaseUser, setCors, supabaseServiceRequest } from './monetization-utils.js';
import { getFinanceAdminIds } from './finance-admin-summary.js';

const MAX_ROWS = 5000;
const MAX_AMOUNT = 1_000_000_000_000;
const CATEGORIES = new Set(['payment_fee', 'tax', 'transfer_fee', 'other_fee']);
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
export function normalizePayoutRow(row, index = 0) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new MonetizationError(`Baris ${index + 1} tidak valid.`, 'PAYOUT_ROW_INVALID', 400);
  const orderId = String(row.order_id || '').trim();
  const amount = Number(row.fee_amount_idr);
  const gross = row.gross_amount_idr === '' || row.gross_amount_idr == null ? null : Number(row.gross_amount_idr);
  const category = String(row.fee_category || 'payment_fee').trim().toLowerCase();
  const occurred = row.occurred_at ? Date.parse(row.occurred_at) : NaN;
  const payoutReference = String(row.payout_reference || '').trim();
  const sourceReference = String(row.source_reference || '').trim();
  if ((orderId && !/^[A-Za-z0-9._:-]{1,120}$/.test(orderId)) || !Number.isSafeInteger(amount) || amount < 0 || amount > MAX_AMOUNT || !CATEGORIES.has(category) ||
      (gross !== null && (!Number.isSafeInteger(gross) || gross < 0 || gross > MAX_AMOUNT)) ||
      (orderId && orderId.length > 120) || payoutReference.length > 120 || sourceReference.length > 160 ||
      (!row.occurred_at || !Number.isFinite(occurred))) {
    throw new MonetizationError(`Nominal/kategori/referensi/tanggal baris ${index + 1} tidak valid.`, 'PAYOUT_ROW_INVALID', 400);
  }
  if (!orderId && !payoutReference && !sourceReference) throw new MonetizationError(`Baris ${index + 1} tidak memiliki order ID atau referensi laporan.`, 'PAYOUT_ROW_UNIDENTIFIED', 400);
  const normalized = { order_id: orderId || null, fee_category: category, amount_idr: amount,
    gross_amount_idr: gross, currency: String(row.currency || 'IDR').toUpperCase(),
    occurred_at: Number.isFinite(occurred) ? new Date(occurred).toISOString() : null,
    payout_reference: payoutReference || null, source_reference: sourceReference || null,
    payment_type: String(row.payment_type || '').slice(0, 80) || null };
  if (normalized.currency !== 'IDR') throw new MonetizationError(`Baris ${index + 1}: hanya mata uang IDR yang diterima.`, 'PAYOUT_CURRENCY_UNSUPPORTED', 400);
  normalized.source_row_hash = hash(JSON.stringify(normalized));
  return normalized;
}
export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return jsonResponse(res, 405, { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  try {
    const { user } = await requireSupabaseUser(req);
    if (!getFinanceAdminIds().has(String(user.id).toLowerCase())) return jsonResponse(res, 403, { error: 'Akses admin keuangan tidak diizinkan.', code: 'FINANCE_ADMIN_REQUIRED' });
    const body = parseBody(req.body) || {};
    if (!Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > MAX_ROWS) throw new MonetizationError(`Impor harus berisi 1–${MAX_ROWS} baris.`, 'PAYOUT_IMPORT_SIZE_INVALID', 400);
    const payoutReference = String(body.payout_reference || '').trim().slice(0, 120);
    const rows = body.rows.map((row, i) => normalizePayoutRow({ ...row, payout_reference: row.payout_reference || payoutReference }, i));
    const unique = [...new Map(rows.map((row) => [row.source_row_hash, row])).values()];
    const orderIds = [...new Set(unique.map((row) => row.order_id).filter(Boolean))];
    const orderMap = new Map();
    for (let i = 0; i < orderIds.length; i += 100) {
      const ids = orderIds.slice(i, i + 100).map((id) => `"${id.replaceAll('"', '')}"`).join(',');
      const found = await supabaseServiceRequest(`monetization_orders?select=order_id,plan_id,tier_id&order_id=in.(${ids})`);
      for (const order of found || []) orderMap.set(order.order_id, order);
    }
    const records = unique.map((row) => ({ ...row, plan_id: orderMap.get(row.order_id)?.plan_id || null,
      tier_id: orderMap.get(row.order_id)?.tier_id || null, order_matched: Boolean(orderMap.get(row.order_id)), imported_by: user.id }));
    let inserted = 0;
    for (let i = 0; i < records.length; i += 250) {
      const result = await supabaseServiceRequest('monetization_payout_fee_entries?on_conflict=source_row_hash', {
        method: 'POST', body: records.slice(i, i + 250), prefer: 'resolution=ignore-duplicates,return=representation'
      });
      inserted += Array.isArray(result) ? result.length : 0;
    }
    return jsonResponse(res, 200, { received_rows: rows.length, unique_rows: unique.length, inserted_rows: inserted,
      duplicate_rows: rows.length - unique.length + unique.length - inserted,
      matched_orders: records.filter((r) => r.order_matched).length,
      unmatched_orders: records.filter((r) => r.order_id && !r.order_matched).length,
      unallocated_rows: records.filter((r) => !r.order_id).length,
      imported_fee_idr: records.reduce((sum, r) => sum + r.amount_idr, 0),
      note: 'Baris tanpa order ID tetap tercatat sebagai biaya belum teralokasi. Import idempotent berdasarkan hash baris ternormalisasi.' });
  } catch (error) { return jsonResponse(res, error.status || 500, { error: error.message || 'Impor payout gagal.', code: error.code || 'PAYOUT_IMPORT_ERROR' }); }
}
