/** [AI-GENERATED][SECURITY][V342-D] Server-authoritative feature quotas and trial helpers. */
import { requireSupabaseUser, supabaseServiceRequest, MonetizationError } from './monetization-utils.js';

const FEATURE_IDS = new Set(['ai_analysis', 'ai_tips', 'cloud_translation']);

export function parseFeatureQuotaConfig(env = process.env) {
  const raw = String(env.FEATURE_QUOTAS_JSON || '').trim();
  if (!raw) throw new MonetizationError('FEATURE_QUOTAS_JSON belum dikonfigurasi.', 'FEATURE_QUOTAS_NOT_CONFIGURED', 503);
  let config;
  try { config = JSON.parse(raw); }
  catch { throw new MonetizationError('FEATURE_QUOTAS_JSON bukan JSON yang valid.', 'FEATURE_QUOTAS_CONFIG_INVALID', 503); }
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new MonetizationError('Konfigurasi kuota fitur tidak valid.', 'FEATURE_QUOTAS_CONFIG_INVALID', 503);
  for (const tier of ['free', 'lite', 'pro']) {
    const features = config[tier];
    if (!features || typeof features !== 'object' || Array.isArray(features)) throw new MonetizationError(`Konfigurasi kuota tier ${tier} tidak tersedia.`, 'FEATURE_QUOTAS_CONFIG_INVALID', 503);
    for (const feature of FEATURE_IDS) {
      const entry = features[feature];
      if (!entry || typeof entry !== 'object' || !Object.hasOwn(entry, 'limit') ||
          !(entry.limit === null || (Number.isSafeInteger(entry.limit) && entry.limit >= 0 && entry.limit <= 2147483647))) {
        throw new MonetizationError(`Kuota ${tier}.${feature} harus berupa integer >= 0 atau null (tanpa batas).`, 'FEATURE_QUOTAS_CONFIG_INVALID', 503);
      }
    }
  }
  return config;
}

export async function requireFeatureUser(req) {
  return requireSupabaseUser(req);
}

export async function consumeFeatureQuota(userId, featureId, env = process.env) {
  if (!FEATURE_IDS.has(featureId)) throw new MonetizationError('Fitur tidak dikenal.', 'FEATURE_UNKNOWN', 400);
  const config = parseFeatureQuotaConfig(env);
  const result = await supabaseServiceRequest('rpc/consume_feature_quota', {
    method: 'POST', body: { p_user_id: userId, p_feature_id: featureId, p_quota_config: config }, env
  });
  const item = Array.isArray(result) ? result[0] : result;
  if (!item || typeof item.allowed !== 'boolean') throw new MonetizationError('Respons kuota fitur tidak valid.', 'FEATURE_QUOTA_RESPONSE_INVALID', 503);
  if (!item.allowed) {
    const error = new MonetizationError('Kuota fitur ini telah habis untuk periode saat ini.', 'FEATURE_QUOTA_EXCEEDED', 429);
    error.feature = featureId;
    error.limit = item.limit;
    error.used = item.used;
    error.resets_at = item.resets_at;
    throw error;
  }
  return item;
}

export function featureErrorResponse(res, error) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const status = Number(error?.status) || 500;
  return res.status(status).json({
    error: error?.message || 'Akses fitur belum dapat diverifikasi.',
    code: error?.code || 'FEATURE_ACCESS_ERROR',
    ...(error?.feature ? { feature: error.feature, limit: error.limit, used: error.used, resets_at: error.resets_at } : {})
  });
}
