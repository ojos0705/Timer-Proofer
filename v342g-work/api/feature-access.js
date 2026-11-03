/** [AI-GENERATED][SECURITY][V342-D] Read-only account feature access summary. */
import { jsonResponse, requireSupabaseUser, setCors, supabaseServiceRequest } from './monetization-utils.js';
import { parseFeatureQuotaConfig } from './feature-access-utils.js';

export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return jsonResponse(res, 405, { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  try {
    const { user } = await requireSupabaseUser(req);
    let quotas = null;
    let quotaConfigError = null;
    try { quotas = parseFeatureQuotaConfig(); }
    catch (error) { quotaConfigError = error; }
    const [membershipRows, trialRows, usageRows] = await Promise.all([
      supabaseServiceRequest(`user_entitlements?select=plan_id,plan_name,tier_id,billing_period,status,starts_at,expires_at&user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&starts_at=lte.${encodeURIComponent(new Date().toISOString())}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=expires_at.desc&limit=1`),
      supabaseServiceRequest(`free_trial_claims?select=started_at,expires_at&user_id=eq.${encodeURIComponent(user.id)}&limit=1`),
      supabaseServiceRequest(`feature_usage_daily?select=feature_id,usage_date,used_count&user_id=eq.${encodeURIComponent(user.id)}&usage_date=eq.${new Date().toISOString().slice(0, 10)}`)
    ]);
    const membership = membershipRows?.[0] || null;
    const tier = membership?.tier_id || 'free';
    const used = Object.fromEntries((usageRows || []).map((row) => [row.feature_id, Number(row.used_count) || 0]));
    const features = quotas ? Object.fromEntries(Object.entries(quotas[tier] || quotas.free).map(([feature, entry]) => [feature, {
      limit: entry.limit, used: used[feature] || 0,
      remaining: entry.limit === null ? null : Math.max(0, entry.limit - (used[feature] || 0)),
      unlimited: entry.limit === null
    }])) : {};
    const trial = trialRows?.[0] || null;
    return jsonResponse(res, 200, {
      tier, membership: membership ? { ...membership } : { plan_id: 'free', plan_name: 'Free', tier_id: 'free', status: 'free' },
      quota_configured: Boolean(quotas), quota_configuration_error: quotaConfigError?.code || null,
      features, trial: { eligible: !trial && !membership, claimed: Boolean(trial), started_at: trial?.started_at || null, expires_at: trial?.expires_at || null }
    });
  } catch (error) {
    return jsonResponse(res, error.status || 500, { error: error.message || 'Status akses fitur belum dapat dimuat.', code: error.code || 'FEATURE_ACCESS_ERROR' });
  }
}
