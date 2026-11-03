/** [AI-GENERATED][SECURITY][V341] A user can inspect only their own payment order. */
import { jsonResponse, MonetizationError, requireSupabaseUser, setCors, supabaseServiceRequest } from './monetization-utils.js';
export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return jsonResponse(res, 405, { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  try {
    const { user } = await requireSupabaseUser(req);
    const orderId = String(req.query?.order_id || '').trim();
    if (!/^TPP-[A-Z0-9-]{12,80}$/.test(orderId)) throw new MonetizationError('order_id tidak valid.', 'MONETIZATION_INVALID_ORDER', 400);
    const rows = await supabaseServiceRequest(`monetization_orders?select=order_id,plan_id,plan_name,tier_id,billing_period,amount,currency,duration_days,status,provider_status,created_at,paid_at&order_id=eq.${encodeURIComponent(orderId)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
    const order = Array.isArray(rows) ? rows[0] : null;
    if (!order) throw new MonetizationError('Transaksi tidak ditemukan untuk akun ini.', 'MONETIZATION_ORDER_NOT_FOUND', 404);
    return jsonResponse(res, 200, { order });
  } catch (error) {
    return jsonResponse(res, error.status || 500, { error: error.message, code: error.code || 'MONETIZATION_STATUS_ERROR' });
  }
}
