/** [AI-GENERATED][SECURITY][V341] Authenticated, server-priced Midtrans Snap checkout. */
import {
  assertServerConfig, createOrderId, getPlanById,
  jsonResponse, MonetizationError, parseBody,
  requireSupabaseUser, setCors, supabaseServiceRequest
} from './monetization-utils.js';
import { normalizePaymentCustomerDetails as normalizeCustomer } from './payment-utils.js';

const rateBuckets = new Map();
function rateLimit(userId) {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) if (now - bucket.start >= 60000) rateBuckets.delete(key);
  const bucket = rateBuckets.get(userId) || { start: now, count: 0 };
  if (bucket.count >= 5) return true;
  bucket.count += 1;
  rateBuckets.set(userId, bucket);
  return false;
}

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return jsonResponse(res, 405, { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  try {
    const { user } = await requireSupabaseUser(req);
    const { midtrans } = assertServerConfig();
    if (rateLimit(user.id)) {
      res.setHeader('Retry-After', '60');
      return jsonResponse(res, 429, { error: 'Terlalu banyak percobaan checkout. Coba lagi dalam satu menit.', code: 'MONETIZATION_RATE_LIMITED' });
    }
    const body = parseBody(req.body);
    if (!body || typeof body.plan_id !== 'string') throw new MonetizationError('plan_id wajib dipilih dari katalog server.', 'MONETIZATION_INVALID_PLAN', 400);
    const plan = getPlanById(body.plan_id);

    const orderId = createOrderId();
    const customer = normalizeCustomer(body.customer_details);
    await supabaseServiceRequest('monetization_orders', {
      method: 'POST', env: process.env, body: {
        order_id: orderId, user_id: user.id, plan_id: plan.id,
        plan_name: plan.name, tier_id: plan.tier_id, billing_period: plan.billing_period,
        amount: plan.amount, currency: 'IDR', duration_days: plan.duration_days,
        status: 'pending', provider: 'midtrans'
      }, prefer: 'return=minimal'
    });

    const endpoint = `${midtrans.isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'}/snap/v1/transactions`;
    let gatewayResponse;
    try {
      gatewayResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${midtrans.serverKey}:`).toString('base64')}`,
          'Content-Type': 'application/json', Accept: 'application/json'
        },
        body: JSON.stringify({
          transaction_details: { order_id: orderId, gross_amount: plan.amount },
          customer_details: customer,
          item_details: [{ id: plan.id, price: plan.amount, quantity: 1, name: plan.name.slice(0, 50) }]
        }),
        signal: AbortSignal.timeout(15000)
      });
    } catch {
      await supabaseServiceRequest(`monetization_orders?order_id=eq.${encodeURIComponent(orderId)}`, {
        method: 'PATCH', env: process.env, body: { status: 'failed', updated_at: new Date().toISOString() }, prefer: 'return=minimal'
      }).catch(() => {});
      throw new MonetizationError('Tidak dapat menghubungi Midtrans. Silakan coba kembali.', 'MONETIZATION_GATEWAY_UNAVAILABLE', 502);
    }
    const gateway = await gatewayResponse.json().catch(() => null);
    if (!gatewayResponse.ok || !gateway?.token) {
      await supabaseServiceRequest(`monetization_orders?order_id=eq.${encodeURIComponent(orderId)}`, {
        method: 'PATCH', env: process.env, body: { status: 'failed', updated_at: new Date().toISOString() }, prefer: 'return=minimal'
      }).catch(() => {});
      throw new MonetizationError('Midtrans gagal membuat sesi pembayaran.', 'MONETIZATION_GATEWAY_REJECTED', 502);
    }
    return jsonResponse(res, 200, { token: gateway.token, redirect_url: gateway.redirect_url || null, order_id: orderId, amount: plan.amount, currency: 'IDR', plan: { id: plan.id, name: plan.name, tier_id: plan.tier_id, tier_name: plan.tier_name, billing_period: plan.billing_period, duration_days: plan.duration_days } });
  } catch (error) {
    return jsonResponse(res, error.status || 500, { error: error.message || 'Gagal menyiapkan pembayaran.', code: error.code || 'MONETIZATION_INTERNAL_ERROR' });
  }
}
