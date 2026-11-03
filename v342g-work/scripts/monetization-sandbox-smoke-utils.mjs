/** [AI-GENERATED][QA][V342-J] Safe read-only certification of an already-paid Midtrans Sandbox order. */
import { mapMidtransStatus } from '../api/monetization-utils.js';

const ORDER_ID_PATTERN = /^TPP-[A-Z0-9-]{12,80}$/;

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`Konfigurasi wajib belum tersedia: ${name}`);
  return value;
}

function parseIDR(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || !Number.isSafeInteger(Math.round(number))) return null;
  return Math.round(number);
}

async function readJson(response, label) {
  if (!response.ok) throw new Error(`${label} gagal dengan HTTP ${response.status}.`);
  const body = await response.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(`${label} mengembalikan JSON yang tidak valid.`);
  return body;
}

export async function runMonetizationSandboxSmoke(env = process.env, fetchImpl = fetch) {
  if (String(env.MIDTRANS_IS_PRODUCTION || '').toLowerCase() !== 'false') {
    throw new Error('Pemeriksaan dihentikan: MIDTRANS_IS_PRODUCTION harus ditetapkan eksplisit ke false.');
  }
  const serverKey = required(env, 'MIDTRANS_SERVER_KEY');
  if (!serverKey.startsWith('SB-')) throw new Error('Pemeriksaan dihentikan: MIDTRANS_SERVER_KEY bukan key Sandbox berawalan SB-.');
  const baseUrl = required(env, 'MONETIZATION_SANDBOX_BASE_URL').replace(/\/+$/, '');
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(base.hostname)) {
    throw new Error('MONETIZATION_SANDBOX_BASE_URL harus berupa URL HTTPS publik.');
  }
  const accessToken = required(env, 'MONETIZATION_SANDBOX_USER_ACCESS_TOKEN');
  const orderId = required(env, 'MONETIZATION_SANDBOX_ORDER_ID');
  if (!ORDER_ID_PATTERN.test(orderId)) throw new Error('MONETIZATION_SANDBOX_ORDER_ID tidak sesuai format order aplikasi.');

  const auth = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
  const timeout = AbortSignal.timeout(12000);
  const providerResponse = await fetchImpl(`https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`, {
    method: 'GET', headers: { Authorization: auth, Accept: 'application/json' }, signal: timeout
  });
  const provider = await readJson(providerResponse, 'Midtrans Sandbox Get Status');
  if (provider.order_id !== orderId) throw new Error('Order ID dari Midtrans tidak cocok.');
  if (String(provider.currency || '').toUpperCase() !== 'IDR') throw new Error('Mata uang transaksi bukan IDR.');
  const providerAmount = parseIDR(provider.gross_amount);
  if (providerAmount === null) throw new Error('Nominal Midtrans tidak valid.');
  const providerState = mapMidtransStatus(provider.transaction_status, provider.fraud_status);
  if (providerState !== 'paid') throw new Error(`Transaksi Sandbox belum berstatus berhasil (status provider: ${String(provider.transaction_status || 'unknown')}).`);

  const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
  const paymentResponse = await fetchImpl(`${base}/api/payment-status?order_id=${encodeURIComponent(orderId)}`, {
    method: 'GET', headers, signal: AbortSignal.timeout(12000)
  });
  const paymentPayload = await readJson(paymentResponse, 'API payment-status');
  const order = paymentPayload.order;
  if (!order || order.order_id !== orderId) throw new Error('Order tidak ditemukan pada API aplikasi untuk akun uji.');
  if (String(order.currency || '').toUpperCase() !== 'IDR' || parseIDR(order.amount) !== providerAmount) {
    throw new Error('Nominal/mata uang pada aplikasi tidak cocok dengan Midtrans.');
  }
  if (order.status !== 'paid') throw new Error(`Status order aplikasi belum paid (status: ${String(order.status || 'unknown')}). Webhook mungkin belum diproses.`);

  const entitlementResponse = await fetchImpl(`${base}/api/my-entitlements`, {
    method: 'GET', headers, signal: AbortSignal.timeout(12000)
  });
  const entitlementPayload = await readJson(entitlementResponse, 'API my-entitlements');
  const membership = entitlementPayload.membership;
  if (!membership || membership.status !== 'active' || membership.plan_id !== order.plan_id) {
    throw new Error('Entitlement aktif untuk paket pada order uji belum terkonfirmasi.');
  }
  if (entitlementPayload.is_premium !== true) throw new Error('API entitlement tidak menandai akun uji sebagai premium.');

  return {
    certified: true,
    environment: 'midtrans-sandbox',
    order_id: orderId,
    provider_status: provider.transaction_status,
    order_status: order.status,
    plan_id: order.plan_id,
    amount_idr: providerAmount,
    entitlement_status: membership.status,
    checks: ['sandbox-key-and-environment', 'provider-order-identity', 'provider-currency-and-amount', 'provider-payment-success', 'account-scoped-order-status', 'paid-order-status', 'matching-active-entitlement']
  };
}
