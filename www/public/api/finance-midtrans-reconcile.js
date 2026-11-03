/** [AI-GENERATED][FINANCE][V342-G] Admin-only, read-only Midtrans status reconciliation. */
import {
  getMidtransConfig, jsonResponse, midtransBaseUrl, MonetizationError,
  requireSupabaseUser, setCors, supabaseServiceRequest
} from './monetization-utils.js';
import { getFinanceAdminIds } from './finance-admin-summary.js';
import { safeIDR } from './finance-reconciliation-utils.js';

const MAX_ORDERS = 200;
const IDR = safeIDR;

export function normalizeMidtransReconciliation(order, transaction, syncedAt = new Date().toISOString()) {
  if (!order?.order_id || transaction?.order_id !== order.order_id) {
    throw new MonetizationError('Order ID dari Midtrans tidak cocok.', 'FINANCE_RECONCILE_ORDER_MISMATCH', 409);
  }
  const gross = IDR(transaction.gross_amount);
  const orderAmount = IDR(order.amount);
  if (gross === null || orderAmount === null || gross !== orderAmount || (transaction.currency && transaction.currency !== 'IDR')) {
    throw new MonetizationError('Nominal atau mata uang Midtrans tidak cocok dengan order.', 'FINANCE_RECONCILE_AMOUNT_MISMATCH', 409);
  }
  const refunds = Array.isArray(transaction.refunds) ? transaction.refunds.slice(0, 100).map((refund) => ({
    refund_chargeback_id: refund?.refund_chargeback_id == null ? null : String(refund.refund_chargeback_id).slice(0, 80),
    refund_key: typeof refund?.refund_key === 'string' ? refund.refund_key.slice(0, 120) : null,
    refund_amount_idr: IDR(refund?.refund_amount),
    created_at: typeof refund?.created_at === 'string' ? refund.created_at.slice(0, 40) : null,
    bank_confirmed_at: typeof refund?.bank_confirmed_at === 'string' ? refund.bank_confirmed_at.slice(0, 40) : null,
    refund_method: typeof refund?.refund_method === 'string' ? refund.refund_method.slice(0, 30) : null
  })).filter((refund) => refund.refund_amount_idr !== null) : [];
  const acknowledgedRefund = IDR(transaction.refund_amount) ?? refunds.reduce((sum, refund) => sum + refund.refund_amount_idr, 0);
  const confirmedRefund = refunds.filter((refund) => refund.bank_confirmed_at).reduce((sum, refund) => sum + refund.refund_amount_idr, 0);
  if (acknowledgedRefund > gross || confirmedRefund > gross || confirmedRefund > acknowledgedRefund) {
    throw new MonetizationError('Data refund Midtrans tidak konsisten dengan nominal transaksi.', 'FINANCE_RECONCILE_REFUND_INVALID', 409);
  }
  return {
    order_id: order.order_id,
    provider_transaction_id: typeof transaction.transaction_id === 'string' ? transaction.transaction_id.slice(0, 120) : null,
    provider_status: typeof transaction.transaction_status === 'string' ? transaction.transaction_status.slice(0, 40) : null,
    payment_type: typeof transaction.payment_type === 'string' ? transaction.payment_type.slice(0, 60) : null,
    gross_amount_idr: gross,
    refund_amount_idr: acknowledgedRefund,
    bank_confirmed_refund_amount_idr: confirmedRefund,
    settlement_time: typeof transaction.settlement_time === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(transaction.settlement_time) ? `${transaction.settlement_time.replace(' ', 'T')}+07:00` : null,
    refund_details: refunds,
    synced_at: syncedAt
  };
}


async function readOrders(days) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = await supabaseServiceRequest(`monetization_orders?select=order_id,tier_id,amount,currency,status,created_at&created_at=gte.${encodeURIComponent(since)}&status=in.(paid,refunded)&order=created_at.desc&limit=${MAX_ORDERS + 1}`);
  if (!Array.isArray(rows)) throw new MonetizationError('Daftar order tidak valid.', 'FINANCE_RECONCILE_DATA_INVALID', 503);
  return { orders: rows.slice(0, MAX_ORDERS), truncated: rows.length > MAX_ORDERS };
}

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return jsonResponse(res, 405, { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  try {
    const { user } = await requireSupabaseUser(req);
    if (!getFinanceAdminIds().has(String(user.id).toLowerCase())) {
      return jsonResponse(res, 403, { error: 'Akses rekonsiliasi keuangan tidak diizinkan.', code: 'FINANCE_ADMIN_REQUIRED' });
    }
    const midtrans = getMidtransConfig();
    if (!midtrans.serverKey) throw new MonetizationError('MIDTRANS_SERVER_KEY belum dikonfigurasi.', 'MONETIZATION_SERVER_NOT_CONFIGURED', 503);
    const rawDays = Number(req.query?.days ?? 30);
    const days = Number.isInteger(rawDays) ? Math.max(1, Math.min(90, rawDays)) : 30;
    const { orders, truncated } = await readOrders(days);
    const snapshots = [];
    const errors = [];
    for (const order of orders) {
      try {
        const url = `${midtransBaseUrl(midtrans.isProduction)}/v2/${encodeURIComponent(order.order_id)}/status`;
        const response = await fetch(url, {
          headers: { Authorization: `Basic ${Buffer.from(`${midtrans.serverKey}:`).toString('base64')}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(10000)
        });
        const transaction = await response.json().catch(() => null);
        if (!response.ok || !transaction) throw new MonetizationError('Status transaksi tidak tersedia dari Midtrans.', 'FINANCE_RECONCILE_PROVIDER_ERROR', 502);
        const snapshot = normalizeMidtransReconciliation(order, transaction);
        const saved = await supabaseServiceRequest('monetization_provider_reconciliations?on_conflict=order_id', {
          method: 'POST', body: snapshot, prefer: 'resolution=merge-duplicates,return=representation'
        });
        snapshots.push(Array.isArray(saved) ? saved[0] || snapshot : snapshot);
      } catch (error) {
        errors.push({ order_id: order.order_id, code: error.code || 'FINANCE_RECONCILE_ORDER_ERROR', message: String(error.message || 'Gagal').slice(0, 180) });
      }
    }
    return jsonResponse(res, 200, {
      period_days: days, scanned_orders: orders.length, reconciled_orders: snapshots.length,
      failed_orders: errors.length, truncated, snapshots,
      errors: errors.slice(0, 50),
      note: 'Data berasal dari GET Status Midtrans. Refund diakui terkonfirmasi bank hanya bila refund detail memuat bank_confirmed_at. MDR/biaya settlement tidak disediakan oleh status transaksi; gunakan Payout Report Midtrans untuk rekonsiliasi biaya.'
    });
  } catch (error) {
    return jsonResponse(res, error.status || 500, { error: error.message || 'Rekonsiliasi Midtrans gagal.', code: error.code || 'FINANCE_RECONCILE_ERROR' });
  }
}
