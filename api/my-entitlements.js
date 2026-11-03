/** [AI-GENERATED][SECURITY][V341] Entitlements are read from server-owned records, never local storage. */
import { jsonResponse, requireSupabaseUser, setCors, supabaseServiceRequest } from './monetization-utils.js';
export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return jsonResponse(res, 405, { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  try {
    const { user } = await requireSupabaseUser(req);
    const rows = await supabaseServiceRequest(`user_entitlements?select=id,plan_id,plan_name,tier_id,billing_period,status,starts_at,expires_at,source_order_id&user_id=eq.${encodeURIComponent(user.id)}&order=expires_at.desc&limit=100`);
    const now = Date.now();
    const entitlements = (Array.isArray(rows) ? rows : []).map((item) => ({
      ...item,
      active: item.status === 'active' && Date.parse(item.starts_at) <= now && Date.parse(item.expires_at) > now
    }));
    const activeEntitlements = entitlements.filter((item) => item.active).sort((a, b) => Date.parse(b.expires_at) - Date.parse(a.expires_at));
    const current = activeEntitlements[0] || null;
    return jsonResponse(res, 200, {
      entitlements,
      is_premium: activeEntitlements.length > 0,
      membership: current ? {
        status: 'active', plan_id: current.plan_id, plan_name: current.plan_name || current.plan_id,
        tier_id: current.tier_id || current.plan_id, billing_period: current.billing_period || 'custom',
        starts_at: current.starts_at, expires_at: current.expires_at, days_remaining: Math.max(0, Math.ceil((Date.parse(current.expires_at) - now) / 86400000))
      } : { status: 'free', plan_id: 'free', plan_name: 'Free', tier_id: 'free', billing_period: 'none', starts_at: null, expires_at: null, days_remaining: 0 }
    });
  } catch (error) {
    return jsonResponse(res, error.status || 500, { error: error.message, code: error.code || 'MONETIZATION_ENTITLEMENTS_ERROR' });
  }
}
