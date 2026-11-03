/** [AI-GENERATED][FINANCE][V342-G] Pure tier reconciliation helpers. */
export function safeIDR(value) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= 1_000_000_000_000 ? amount : null;
}

export function summarizeAICostByTier(events) {
  const result = {};
  for (const event of events) {
    const tier = ['free', 'lite', 'pro'].includes(String(event.tier_id || '').toLowerCase()) ? String(event.tier_id).toLowerCase() : 'unknown';
    const row = result[tier] ||= { estimated_cost_idr: 0, priced_events: 0, unpriced_events: 0 };
    const amount = event.estimated_cost_idr === null || event.estimated_cost_idr === undefined ? null : Number(event.estimated_cost_idr);
    if (Number.isFinite(amount) && amount >= 0) { row.estimated_cost_idr += amount; row.priced_events++; }
    else row.unpriced_events++;
  }
  for (const row of Object.values(result)) row.estimated_cost_idr = Math.round(row.estimated_cost_idr);
  return result;
}
export function summarizeTierReconciliation(orders, snapshots) {
  const snapshotByOrder = new Map(snapshots.map((row) => [row.order_id, row]));
  const tiers = {};
  for (const order of orders) {
    const tier = ['free', 'lite', 'pro'].includes(String(order.tier_id || '').toLowerCase()) ? String(order.tier_id).toLowerCase() : 'unknown';
    const row = tiers[tier] ||= { orders: 0, paid_gross_idr: 0, settled_gross_idr: 0, acknowledged_refunds_idr: 0, bank_confirmed_refunds_idr: 0, ai_estimated_cost_idr: 0, unverified_orders: 0 };
    const amount = safeIDR(order.amount);
    if (amount === null) continue;
    if (order.status === 'paid' || order.status === 'refunded') { row.orders++; row.paid_gross_idr += amount; }
    const snapshot = snapshotByOrder.get(order.order_id);
    if (!snapshot) { if (order.status === 'paid' || order.status === 'refunded') row.unverified_orders++; continue; }
    if (['settlement', 'refund', 'partial_refund', 'chargeback', 'partial_chargeback'].includes(snapshot.provider_status) || snapshot.settlement_time) row.settled_gross_idr += Number(snapshot.gross_amount_idr) || 0;
    row.acknowledged_refunds_idr += Number(snapshot.refund_amount_idr) || 0;
    row.bank_confirmed_refunds_idr += Number(snapshot.bank_confirmed_refund_amount_idr) || 0;
  }
  return Object.fromEntries(Object.entries(tiers).sort(([a], [b]) => a.localeCompare(b)));
}

