/** [AI-GENERATED][SECURITY][V342-F] Finance summary and append-only cost ledger API. */
import {
  jsonResponse, MonetizationError, parseBody, requireSupabaseUser, setCors, supabaseServiceRequest
} from './monetization-utils.js';
import { aggregateAIUsageEvents } from './ai-cost-utils.js';
import { summarizeAICostByTier, summarizeTierReconciliation } from './finance-reconciliation-utils.js';

const CATEGORIES = new Set(['payment_fee', 'tax', 'infrastructure', 'provider_cost', 'refund_adjustment', 'other_cost']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getFinanceAdminIds(env = process.env) {
  return new Set(String(env.FINANCE_ADMIN_USER_IDS || '').split(',').map((v) => v.trim().toLowerCase()).filter((v) => UUID.test(v)));
}

async function readAll(path, maxRows = 10000) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const page = await supabaseServiceRequest(`${path}&limit=${pageSize}&offset=${offset}`);
    if (!Array.isArray(page)) throw new MonetizationError('Data keuangan memiliki format tidak valid.', 'FINANCE_DATA_INVALID', 503);
    rows.push(...page);
    if (page.length < pageSize) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

export function summarizeFinanceOrders(orders) {
  const summary = { paid_orders: 0, pending_orders: 0, failed_orders: 0, refunded_orders: 0,
    paid_gross_idr: 0, refunded_order_gross_idr: 0, pending_gross_idr: 0 };
  for (const order of orders) {
    const amount = Number(order.amount);
    if (!Number.isSafeInteger(amount) || amount < 0) continue;
    if (order.status === 'paid') { summary.paid_orders++; summary.paid_gross_idr += amount; }
    else if (order.status === 'pending') { summary.pending_orders++; summary.pending_gross_idr += amount; }
    else if (order.status === 'failed') summary.failed_orders++;
    else if (order.status === 'refunded') { summary.refunded_orders++; summary.refunded_order_gross_idr += amount; }
  }
  return summary;
}

export function summarizeFinanceAdjustments(adjustments) {
  const byCategory = {};
  const byEvidence = { actual: 0, estimated: 0 };
  for (const row of adjustments) {
    const amount = Number(row.amount_idr);
    if (!Number.isSafeInteger(amount) || amount < 0) continue;
    byCategory[row.category] = (byCategory[row.category] || 0) + amount;
    if (row.evidence_level in byEvidence) byEvidence[row.evidence_level] += amount;
  }
  return { total_recorded_cost_idr: Object.values(byCategory).reduce((a, b) => a + b, 0), by_category_idr: byCategory, by_evidence_level_idr: byEvidence };
}

export default async function handler(req, res) {
  setCors(res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return jsonResponse(res, 405, { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  try {
    const { user } = await requireSupabaseUser(req);
    if (!getFinanceAdminIds().has(String(user.id).toLowerCase())) {
      return jsonResponse(res, 403, { error: 'Akses dashboard keuangan tidak diizinkan.', code: 'FINANCE_ADMIN_REQUIRED' });
    }

    if (req.method === 'POST') {
      const body = parseBody(req.body) || {};
      const category = String(body.category || '');
      const amount = Number(body.amount_idr);
      const evidence = String(body.evidence_level || '');
      const reference = String(body.reference || '').trim();
      const note = String(body.note || '').trim();
      const occurredAtTimestamp = Date.parse(body.occurred_at || '');
      if (!CATEGORIES.has(category) || !Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000_000_000 ||
          !['actual', 'estimated'].includes(evidence) || reference.length < 1 || reference.length > 120 || note.length > 500 ||
          !Number.isFinite(occurredAtTimestamp)) {
        throw new MonetizationError('Data biaya tidak valid. Periksa kategori, nominal, bukti, referensi, dan tanggal.', 'FINANCE_ADJUSTMENT_INVALID', 400);
      }
      const rows = await supabaseServiceRequest('monetization_finance_adjustments', { method: 'POST', body: {
        category, amount_idr: amount, evidence_level: evidence, reference, note,
        occurred_at: new Date(occurredAtTimestamp).toISOString(), created_by: user.id
      }, prefer: 'return=representation' });
      return jsonResponse(res, 201, { adjustment: Array.isArray(rows) ? rows[0] : null });
    }

    const daysRaw = Number(req.query?.days ?? 30);
    const days = Number.isInteger(daysRaw) ? Math.max(1, Math.min(90, daysRaw)) : 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const [ordersResult, adjustmentsResult, aiResult, reconciliationResult, payoutResult] = await Promise.all([
      readAll(`monetization_orders?select=order_id,plan_id,tier_id,billing_period,amount,status,provider_payment_type,created_at,paid_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc`),
      readAll(`monetization_finance_adjustments?select=id,category,amount_idr,evidence_level,reference,note,occurred_at,created_at&occurred_at=gte.${encodeURIComponent(since)}&order=occurred_at.desc`),
      readAll(`ai_usage_events?select=provider,tier_id,feature_id,model_id,outcome,duration_ms,request_units,input_characters,input_tokens,output_tokens,total_tokens,estimated_cost_usd,estimated_cost_idr,pricing_status,created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc`),
      readAll(`monetization_provider_reconciliations?select=order_id,provider_status,gross_amount_idr,refund_amount_idr,bank_confirmed_refund_amount_idr,settlement_time,synced_at&synced_at=gte.${encodeURIComponent(since)}&order=synced_at.desc`),
      readAll(`monetization_payout_fee_entries?select=source_row_hash,order_id,plan_id,tier_id,order_matched,fee_category,amount_idr,gross_amount_idr,occurred_at,payout_reference&occurred_at=gte.${encodeURIComponent(since)}&order=occurred_at.desc`)
    ]);
    const orders = summarizeFinanceOrders(ordersResult.rows);
    const adjustments = summarizeFinanceAdjustments(adjustmentsResult.rows);
    const aiSummary = aggregateAIUsageEvents(aiResult.rows);
    const tierReconciliation = summarizeTierReconciliation(ordersResult.rows, reconciliationResult.rows);
    const aiTierCosts = summarizeAICostByTier(aiResult.rows);
    const payoutCosts = { total_idr: 0, by_category_idr: {}, by_tier_idr: {}, matched_rows: 0, unmatched_rows: 0, unallocated_rows: 0 };
    for (const fee of payoutResult.rows) {
      const amount = Number(fee.amount_idr); if (!Number.isSafeInteger(amount) || amount < 0) continue;
      payoutCosts.total_idr += amount; payoutCosts.by_category_idr[fee.fee_category] = (payoutCosts.by_category_idr[fee.fee_category] || 0) + amount;
      if (fee.order_matched && fee.tier_id) { payoutCosts.matched_rows++; payoutCosts.by_tier_idr[fee.tier_id] = (payoutCosts.by_tier_idr[fee.tier_id] || 0) + amount; }
      else if (fee.order_id) payoutCosts.unmatched_rows++; else payoutCosts.unallocated_rows++;
    }
    for (const [tier, bucket] of Object.entries(tierReconciliation)) {
      bucket.ai_estimated_cost_idr = aiTierCosts[tier]?.estimated_cost_idr || 0;
      bucket.actual_imported_payout_costs_idr = payoutCosts.by_tier_idr[tier] || 0;
      bucket.ai_unpriced_events = aiTierCosts[tier]?.unpriced_events || 0;
      bucket.net_after_confirmed_refunds_before_costs_idr = bucket.settled_gross_idr - bucket.bank_confirmed_refunds_idr;
      bucket.contribution_before_ai_and_other_costs_idr = bucket.net_after_confirmed_refunds_before_costs_idr - bucket.actual_imported_payout_costs_idr;
    }
    const aiPricedIdr = Number(aiSummary.estimated_cost_idr) || 0;
    const aiUnpricedEvents = Number(aiSummary.unpriced_event_count) || 0;
    const missing = [];
    if (!payoutResult.rows.length) missing.push('Payout Report Midtrans belum diimpor pada periode ini.');
    if (payoutCosts.unmatched_rows > 0 || payoutCosts.unallocated_rows > 0) missing.push('Sebagian biaya payout belum dapat dialokasikan ke paket/order.');
    if (!adjustments.by_category_idr.payment_fee && !payoutCosts.total_idr) missing.push('Biaya transaksi Midtrans belum dicatat lengkap.');
    if (!adjustments.by_category_idr.tax) missing.push('Pajak belum dicatat.');
    if (!adjustments.by_category_idr.infrastructure) missing.push('Biaya infrastruktur belum dicatat.');
    if (aiUnpricedEvents > 0) missing.push(`${aiUnpricedEvents} peristiwa AI belum memiliki estimasi biaya lengkap.`);
    if (orders.refunded_orders > 0 && reconciliationResult.rows.length === 0) missing.push('Status refund Midtrans belum direkonsiliasi.');
    if (orders.paid_orders + orders.refunded_orders > reconciliationResult.rows.length) missing.push('Sebagian order belum memiliki snapshot status Midtrans terbaru.');
    const truncated = ordersResult.truncated || adjustmentsResult.truncated || aiResult.truncated || reconciliationResult.truncated || payoutResult.truncated;
    return jsonResponse(res, 200, {
      period_days: days, since, truncated,
      orders,
      tier_reconciliation: tierReconciliation,
      reconciliation_snapshot_count: reconciliationResult.rows.length,
      payout_costs: payoutCosts,
      payout_fee_rows: payoutResult.rows.length,
      tier_ai_costs: aiTierCosts,
      recorded_costs: adjustments,
      recorded_cost_rows: adjustmentsResult.rows.slice(0, 200),
      ai: { summary: aiSummary, priced_estimated_cost_idr: Math.round(aiPricedIdr), unpriced_events: aiUnpricedEvents },
      provisional_operating_balance_idr: orders.paid_gross_idr - (adjustments.total_recorded_cost_idr - (adjustments.by_category_idr.payment_fee || 0)) - payoutCosts.total_idr - Math.round(aiPricedIdr),
      balance_label: 'Saldo indikatif; biaya payout impor menggantikan kategori biaya pembayaran manual untuk mengurangi risiko hitung ganda; bukan laba bersih',
      net_margin_available: false,
      missing_data: missing,
      adjustment_categories: [...CATEGORIES],
      accounting_note: 'Biaya payout impor adalah data aktual sesuai report, tetapi hanya dialokasikan ke tier jika Order ID cocok dengan order internal. Settlement dan refund bank-confirmed berasal dari GET Status Midtrans. Refund yang belum memiliki bank_confirmed_at hanya dianggap acknowledged, bukan refund final. MDR/biaya payout harus dicocokkan dengan Payout Report. Biaya AI merupakan estimasi konfigurasi harga, bukan invoice.'
    });
  } catch (error) {
    return jsonResponse(res, error.status || 500, { error: error.message || 'Ringkasan keuangan tidak dapat dimuat.', code: error.code || 'FINANCE_ADMIN_ERROR' });
  }
}
