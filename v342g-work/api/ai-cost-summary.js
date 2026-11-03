/** [AI-GENERATED][SECURITY][V342-E] Admin-only read endpoint for AI cost and usage summaries. */
import { getSupabaseConfig, jsonResponse, requireSupabaseUser, setCors } from './monetization-utils.js';
import { aggregateAIUsageEvents } from './ai-cost-utils.js';

async function readUsageEvents(since, env = process.env, fetchImpl = fetch) {
  const config = getSupabaseConfig(env);
  if (!config.serviceRoleKey) {
    const error = new Error('SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server.');
    error.code = 'MONETIZATION_SERVER_NOT_CONFIGURED'; error.status = 503; throw error;
  }
  const rows = [];
  const pageSize = 1000;
  const maxRows = 10000;
  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const query = `ai_usage_events?select=provider,tier_id,feature_id,model_id,outcome,duration_ms,request_units,input_characters,input_tokens,output_tokens,total_tokens,estimated_cost_usd,estimated_cost_idr,pricing_status,created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc&limit=${pageSize}`;
    const response = await fetchImpl(`${config.url}/rest/v1/${query}`, {
      method: 'GET', headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, Accept: 'application/json', 'Range-Unit': 'items', Range: `${offset}-${offset + pageSize - 1}`, Prefer: 'count=exact' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      const error = new Error('Ringkasan pemakaian AI tidak dapat dibaca dari database.');
      error.code = 'AI_COST_DATABASE_ERROR'; error.status = 503; throw error;
    }
    const page = await response.json().catch(() => null);
    if (!Array.isArray(page)) {
      const error = new Error('Format data pemakaian AI tidak valid.');
      error.code = 'AI_COST_DATA_INVALID'; error.status = 503; throw error;
    }
    rows.push(...page);
    if (page.length < pageSize) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

function getAdminIds(env = process.env) {
  return new Set(String(env.AI_COST_ADMIN_USER_IDS || '').split(',').map((value) => value.trim().toLowerCase()).filter((value) => /^[0-9a-f-]{36}$/i.test(value)));
}

export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return jsonResponse(res, 405, { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  try {
    const { user } = await requireSupabaseUser(req);
    if (!getAdminIds().has(String(user.id).toLowerCase())) {
      return jsonResponse(res, 403, { error: 'Akses monitoring biaya tidak diizinkan.', code: 'AI_COST_ADMIN_REQUIRED' });
    }
    const requestedDays = Number(req.query?.days ?? 30);
    const days = Number.isInteger(requestedDays) ? Math.max(1, Math.min(90, requestedDays)) : 30;
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const { rows: events, truncated } = await readUsageEvents(since);
    return jsonResponse(res, 200, {
      period_days: days,
      since,
      truncated,
      summary: aggregateAIUsageEvents(events),
      pricing_note: 'Biaya adalah estimasi dari token usage dan AI_MODEL_PRICING_JSON, bukan invoice provider. Peristiwa tanpa tarif atau token lengkap ditampilkan sebagai unpriced.'
    });
  } catch (error) {
    return jsonResponse(res, error.status || 500, { error: error.message || 'Ringkasan biaya AI tidak dapat dimuat.', code: error.code || 'AI_COST_SUMMARY_ERROR' });
  }
}
