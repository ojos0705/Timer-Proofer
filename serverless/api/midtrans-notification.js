/** [AI-GENERATED][SECURITY][V341] Verify signature AND provider status before DB entitlement activation. */
import {
  getMidtransConfig, getSupabaseConfig, jsonResponse, mapMidtransStatus, midtransBaseUrl,
  MonetizationError, parseBody, setCors, supabaseServiceRequest, verifyMidtransSignature
} from './monetization-utils.js';

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return jsonResponse(res, 405, { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  try {
    const midtrans = getMidtransConfig();
    const supabase = getSupabaseConfig();
    if (!midtrans.serverKey || !supabase.serviceRoleKey) throw new MonetizationError('Webhook belum dikonfigurasi di server.', 'MONETIZATION_SERVER_NOT_CONFIGURED', 503);
    const notification = parseBody(req.body);
    if (!notification?.order_id || !verifyMidtransSignature(notification, midtrans.serverKey)) {
      return jsonResponse(res, 401, { error: 'Signature notifikasi Midtrans tidak valid.', code: 'MONETIZATION_INVALID_SIGNATURE' });
    }

    const statusUrl = `${midtransBaseUrl(midtrans.isProduction)}/v2/${encodeURIComponent(notification.order_id)}/status`;
    let providerResponse;
    try {
      providerResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: { Authorization: `Basic ${Buffer.from(`${midtrans.serverKey}:`).toString('base64')}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
    } catch {
      throw new MonetizationError('Verifikasi status transaksi ke Midtrans sementara gagal.', 'MONETIZATION_STATUS_UNAVAILABLE', 503);
    }
    const transaction = await providerResponse.json().catch(() => null);
    if (!providerResponse.ok || !transaction?.order_id || transaction.order_id !== notification.order_id) {
      throw new MonetizationError('Status transaksi tidak dapat diverifikasi ke Midtrans.', 'MONETIZATION_STATUS_UNVERIFIED', 502);
    }
    const amount = Number(transaction.gross_amount);
    const notifiedAmount = Number(notification.gross_amount);
    if (!Number.isFinite(amount) || !Number.isFinite(notifiedAmount) || amount !== notifiedAmount) {
      return jsonResponse(res, 400, { error: 'Nominal notifikasi tidak cocok dengan transaksi Midtrans.', code: 'MONETIZATION_AMOUNT_MISMATCH' });
    }

    // [AI-GENERATED][SECURITY][V341] Cross-check provider facts against the
    // immutable server-created order before changing state or granting access.
    const orderRows = await supabaseServiceRequest(
      `monetization_orders?select=order_id,amount,currency,user_id,status&order_id=eq.${encodeURIComponent(notification.order_id)}&limit=1`
    );
    const order = Array.isArray(orderRows) ? orderRows[0] : null;
    if (!order) return jsonResponse(res, 404, { error: 'Order tidak dikenal oleh sistem.', code: 'MONETIZATION_ORDER_NOT_FOUND' });
    if (Number(order.amount) !== amount || order.currency !== 'IDR' || (transaction.currency && transaction.currency !== 'IDR')) {
      return jsonResponse(res, 400, { error: 'Nominal atau mata uang transaksi tidak cocok dengan order server.', code: 'MONETIZATION_ORDER_AMOUNT_MISMATCH' });
    }

    const status = mapMidtransStatus(transaction.transaction_status, transaction.fraud_status);
    if (status === 'paid') {
      // Do not pre-update status here: the SQL RPC must see and reject a
      // previously refunded order before it can reactivate any entitlement.
      await supabaseServiceRequest('rpc/confirm_monetization_payment', {
        method: 'POST', env: process.env,
        body: {
          p_order_id: notification.order_id,
          p_provider_transaction_id: transaction.transaction_id || null,
          p_provider_status: transaction.transaction_status || 'settlement',
          p_paid_at: transaction.settlement_time || transaction.transaction_time || new Date().toISOString()
        }
      });
    } else {
      await supabaseServiceRequest(`monetization_orders?order_id=eq.${encodeURIComponent(notification.order_id)}`, {
        method: 'PATCH', env: process.env,
        body: {
          status,
          provider_transaction_id: transaction.transaction_id || null,
          provider_status: transaction.transaction_status || null,
          provider_payment_type: transaction.payment_type || null,
          updated_at: new Date().toISOString()
        }, prefer: 'return=representation'
      });
      if (status === 'refunded') {
        await supabaseServiceRequest('rpc/revoke_monetization_entitlement', {
          method: 'POST', env: process.env,
          body: { p_order_id: notification.order_id, p_reason: transaction.transaction_status || 'refund' }
        });
      }
    }
    return jsonResponse(res, 200, { received: true, order_id: notification.order_id, status });
  } catch (error) {
    return jsonResponse(res, error.status || 500, { error: error.message || 'Webhook gagal diproses.', code: error.code || 'MONETIZATION_WEBHOOK_ERROR' });
  }
}
