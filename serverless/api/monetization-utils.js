/**
 * [AI-GENERATED][SECURITY][V341]
 * Shared server-only primitives for Supabase-backed Premium entitlements.
 * Never import this module into browser code: it handles service-role credentials.
 */
import crypto from 'node:crypto';

export const DEFAULT_SUPABASE_URL = 'https://rshnirlkjicnklrybjpf.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzaG5pcmxramljbmtscnlianBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjM0NjAsImV4cCI6MjA5OTY5OTQ2MH0.v5FXEfIQ1hLDLQmWgS9tv0f6OD2VqMdgius_cRjV9FI';
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,47}$/i;

export class MonetizationError extends Error {
  constructor(message, code, status = 400) {
    super(message);
    this.name = 'MonetizationError';
    this.code = code;
    this.status = status;
  }
}

export function jsonResponse(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(status).json(payload);
}

export function setCors(res, methods = 'GET, POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-Requested-With');
  res.setHeader('Vary', 'Origin');
}

export function parseBody(body) {
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }
  return null;
}

export function getBearerToken(req) {
  const value = req?.headers?.authorization || req?.headers?.Authorization || '';
  return String(value).match(/^Bearer\s+([^\s]+)$/i)?.[1] || '';
}

export function getSupabaseConfig(env = process.env) {
  return {
    url: String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, ''),
    anonKey: String(env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY),
    serviceRoleKey: String(env.SUPABASE_SERVICE_ROLE_KEY || '')
  };
}

export function getMidtransConfig(env = process.env) {
  return {
    serverKey: String(env.MIDTRANS_SERVER_KEY || ''),
    clientKey: String(env.MIDTRANS_CLIENT_KEY || ''),
    isProduction: String(env.MIDTRANS_IS_PRODUCTION || '').toLowerCase() === 'true'
  };
}

export function getPlans(env = process.env) {
  const raw = String(env.MONETIZATION_PLANS_JSON || '');
  if (!raw) throw new MonetizationError('Katalog paket belum dikonfigurasi.', 'MONETIZATION_NOT_CONFIGURED', 503);
  let plans;
  try { plans = JSON.parse(raw); }
  catch { throw new MonetizationError('MONETIZATION_PLANS_JSON bukan JSON yang valid.', 'MONETIZATION_CONFIG_INVALID', 503); }
  if (!Array.isArray(plans) || plans.length < 1 || plans.length > 20) {
    throw new MonetizationError('Katalog paket harus berupa array berisi 1–20 paket.', 'MONETIZATION_CONFIG_INVALID', 503);
  }

  const seenIds = new Set();
  const normalized = plans.map((plan) => {
    if (!plan || typeof plan !== 'object' || !ID_PATTERN.test(String(plan.id || ''))) {
      throw new MonetizationError('ID paket tidak valid.', 'MONETIZATION_CONFIG_INVALID', 503);
    }
    const id = String(plan.id);
    if (seenIds.has(id)) throw new MonetizationError(`ID paket ${id} terduplikasi.`, 'MONETIZATION_CONFIG_INVALID', 503);
    seenIds.add(id);

    const amount = Number(plan.amount);
    const durationDays = Number(plan.duration_days);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100_000_000 ||
        !Number.isSafeInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
      throw new MonetizationError(`Harga atau durasi paket ${id} tidak valid.`, 'MONETIZATION_CONFIG_INVALID', 503);
    }
    const name = String(plan.name || '').trim().slice(0, 80);
    if (!name) throw new MonetizationError(`Nama paket ${id} wajib diisi.`, 'MONETIZATION_CONFIG_INVALID', 503);
    const tierId = String(plan.tier_id || id).trim();
    if (!ID_PATTERN.test(tierId)) throw new MonetizationError(`tier_id paket ${id} tidak valid.`, 'MONETIZATION_CONFIG_INVALID', 503);
    const billingPeriod = String(plan.billing_period || 'custom').trim().toLowerCase();
    if (!['monthly', 'annual', 'custom'].includes(billingPeriod)) {
      throw new MonetizationError(`billing_period paket ${id} tidak valid.`, 'MONETIZATION_CONFIG_INVALID', 503);
    }
    const displayOrder = plan.display_order === undefined ? 100 : Number(plan.display_order);
    if (!Number.isSafeInteger(displayOrder) || displayOrder < 0 || displayOrder > 10000) {
      throw new MonetizationError(`display_order paket ${id} tidak valid.`, 'MONETIZATION_CONFIG_INVALID', 503);
    }
    const tierName = String(plan.tier_name || '').trim().slice(0, 80);
    return Object.freeze({
      id, name, amount, currency: 'IDR', duration_days: durationDays,
      period_label: String(plan.period_label || `${durationDays} hari`).trim().slice(0, 40),
      tier_id: tierId, tier_name: tierName || name,
      billing_period: billingPeriod, display_order: displayOrder,
      active: plan.active === true
    });
  });
  const active = normalized.filter((plan) => plan.active);
  if (active.length < 1) {
    throw new MonetizationError('Katalog harus memiliki minimal satu paket aktif.', 'MONETIZATION_ACTIVE_PLAN_INVALID', 503);
  }
  return normalized.sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id));
}

export function getPlanById(planId, env = process.env) {
  const id = String(planId || '').trim();
  const plan = getPlans(env).find((item) => item.active && item.id === id);
  if (!plan) throw new MonetizationError('Paket tidak tersedia atau sudah tidak aktif. Muat ulang katalog.', 'MONETIZATION_PLAN_UNAVAILABLE', 400);
  return plan;
}

// Backward-compatible helper for legacy callers that still require one active plan.
export function getActivePlan(env = process.env) {
  const active = getPlans(env).filter((plan) => plan.active);
  if (active.length !== 1) {
    throw new MonetizationError('Katalog multi-paket tersedia; pemanggil harus memilih plan_id secara eksplisit.', 'MONETIZATION_PLAN_SELECTION_REQUIRED', 503);
  }
  return active[0];
}

export function getPublicCatalog(env = process.env) {
  const plans = getPlans(env).filter((plan) => plan.active).map((plan) => ({ ...plan }));
  return { currency: 'IDR', plans };
}

export async function requireSupabaseUser(req, { env = process.env, fetchImpl = fetch } = {}) {
  const token = getBearerToken(req);
  if (!token) throw new MonetizationError('Login diperlukan untuk membeli Premium.', 'MONETIZATION_AUTH_REQUIRED', 401);
  const config = getSupabaseConfig(env);
  let response;
  try {
    response = await fetchImpl(`${config.url}/auth/v1/user`, {
      method: 'GET',
      headers: { apikey: config.anonKey, Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
  } catch {
    throw new MonetizationError('Validasi sesi login sementara tidak tersedia.', 'MONETIZATION_AUTH_UNAVAILABLE', 503);
  }
  if (!response.ok) throw new MonetizationError('Sesi login tidak valid atau telah berakhir. Silakan login kembali.', 'MONETIZATION_AUTH_INVALID', 401);
  const user = await response.json().catch(() => null);
  if (!user?.id || !/^[0-9a-f-]{36}$/i.test(String(user.id))) {
    throw new MonetizationError('Identitas akun tidak dapat diverifikasi.', 'MONETIZATION_AUTH_INVALID', 401);
  }
  return { user, token };
}

export function assertServerConfig(env = process.env) {
  const supabase = getSupabaseConfig(env);
  const midtrans = getMidtransConfig(env);
  if (!supabase.serviceRoleKey) throw new MonetizationError('SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server.', 'MONETIZATION_SERVER_NOT_CONFIGURED', 503);
  if (!midtrans.serverKey || !midtrans.clientKey) throw new MonetizationError('Kunci Midtrans server/client belum dikonfigurasi.', 'MONETIZATION_PAYMENT_NOT_CONFIGURED', 503);
  return { supabase, midtrans };
}

export async function supabaseServiceRequest(path, { method = 'GET', body, env = process.env, fetchImpl = fetch, prefer = '' } = {}) {
  const config = getSupabaseConfig(env);
  if (!config.serviceRoleKey) throw new MonetizationError('SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server.', 'MONETIZATION_SERVER_NOT_CONFIGURED', 503);
  const response = await fetchImpl(`${config.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(prefer ? { Prefer: prefer } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000)
  });
  const text = await response.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = null; } }
  if (!response.ok) {
    const error = new Error('Database monetisasi tidak dapat memproses permintaan.');
    error.code = 'MONETIZATION_DATABASE_ERROR';
    error.status = 503;
    error.details = data?.code || data?.message || `HTTP ${response.status}`;
    throw error;
  }
  return data;
}

export function createOrderId() {
  return `TPP-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`;
}

export function verifyMidtransSignature(notification, serverKey) {
  const { order_id, status_code, gross_amount, signature_key } = notification || {};
  if (![order_id, status_code, gross_amount, signature_key].every((value) => typeof value === 'string' && value.length > 0)) return false;
  const expected = crypto.createHash('sha512').update(`${order_id}${status_code}${gross_amount}${serverKey}`).digest('hex');
  const actualBuffer = Buffer.from(signature_key, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function mapMidtransStatus(transactionStatus, fraudStatus = '') {
  const status = String(transactionStatus || '').toLowerCase();
  const fraud = String(fraudStatus || '').toLowerCase();
  if (status === 'settlement' || (status === 'capture' && (!fraud || fraud === 'accept'))) return 'paid';
  if (status === 'pending') return 'pending';
  if (['deny', 'cancel', 'expire', 'failure'].includes(status) || (status === 'capture' && fraud === 'challenge')) return 'failed';
  if (['refund', 'partial_refund', 'chargeback', 'partial_chargeback'].includes(status)) return 'refunded';
  return 'pending';
}

export function midtransBaseUrl(isProduction) {
  return isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
}
