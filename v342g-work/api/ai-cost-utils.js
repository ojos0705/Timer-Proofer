/** [AI-GENERATED][OBSERVABILITY][V342-E] Privacy-safe provider usage and cost estimation. */
import crypto from 'node:crypto';
import { getSupabaseConfig } from './monetization-utils.js';

const FEATURE_IDS = new Set(['ai_analysis', 'ai_tips', 'ai_telemetry', 'cloud_translation']);
const MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{1,79}$/i;

export function parseAICostConfig(env = process.env) {
  const raw = String(env.AI_MODEL_PRICING_JSON || '').trim();
  if (!raw) return { configured: false, version: null, models: {} };
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('AI_MODEL_PRICING_JSON bukan JSON yang valid.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
      !parsed.models || typeof parsed.models !== 'object' || Array.isArray(parsed.models)) {
    throw new Error('Format AI_MODEL_PRICING_JSON tidak valid.');
  }
  const models = {};
  for (const [model, rates] of Object.entries(parsed.models)) {
    if (!MODEL_ID_PATTERN.test(model) || !rates || typeof rates !== 'object' || Array.isArray(rates)) {
      throw new Error('Entri model pada AI_MODEL_PRICING_JSON tidak valid.');
    }
    const input = Number(rates.input_usd_per_million);
    const output = Number(rates.output_usd_per_million);
    if (!Number.isFinite(input) || input < 0 || input > 100_000 ||
        !Number.isFinite(output) || output < 0 || output > 100_000) {
      throw new Error(`Tarif model ${model} harus berupa angka USD per satu juta token yang valid.`);
    }
    models[model] = Object.freeze({ input_usd_per_million: input, output_usd_per_million: output });
  }
  const fxRaw = String(env.AI_USD_IDR_RATE || '').trim();
  const usdIdrRate = fxRaw ? Number(fxRaw) : null;
  if (usdIdrRate !== null && (!Number.isFinite(usdIdrRate) || usdIdrRate <= 0 || usdIdrRate > 1_000_000)) {
    throw new Error('AI_USD_IDR_RATE harus berupa kurs IDR per USD yang valid.');
  }
  return {
    configured: Object.keys(models).length > 0,
    version: String(parsed.version || 'unversioned').slice(0, 40),
    models,
    usdIdrRate
  };
}

function safeCount(value) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export function extractAIUsage(response) {
  const usage = response?.usageMetadata || response?.usage_metadata || response?.response?.usageMetadata || null;
  if (!usage) return { inputTokens: null, outputTokens: null, thoughtTokens: null, totalTokens: null };
  const inputTokens = safeCount(usage.promptTokenCount ?? usage.prompt_token_count ?? usage.inputTokenCount);
  const candidateTokens = safeCount(usage.candidatesTokenCount ?? usage.candidates_token_count ?? usage.outputTokenCount);
  const thoughtTokens = safeCount(usage.thoughtsTokenCount ?? usage.thoughts_token_count) ?? 0;
  const cachedTokens = safeCount(usage.cachedContentTokenCount ?? usage.cached_content_token_count) ?? 0;
  const outputTokens = candidateTokens === null ? null : candidateTokens + thoughtTokens;
  const totalTokens = safeCount(usage.totalTokenCount ?? usage.total_token_count) ??
    (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
  return { inputTokens, outputTokens, thoughtTokens, totalTokens, cachedTokens };
}

export function createAIUsageEvent({
  userId = null, tierId = null, featureId, model, outcome, durationMs, response = null,
  errorCode = null, requestId = crypto.randomUUID(), env = process.env, createdAt = new Date().toISOString()
}) {
  if (!FEATURE_IDS.has(featureId)) throw new Error('AI usage feature ID tidak dikenal.');
  const normalizedModel = MODEL_ID_PATTERN.test(String(model || '')) ? String(model) : 'unknown';
  const usage = extractAIUsage(response);
  let estimatedCostUsd = null;
  let estimatedCostIdr = null;
  let pricingVersion = null;
  let pricingStatus = 'unpriced';
  try {
    const config = parseAICostConfig(env);
    const rates = config.models[normalizedModel];
    pricingVersion = config.version;
    if (rates && usage.inputTokens !== null && usage.outputTokens !== null && usage.cachedTokens === 0) {
      estimatedCostUsd = Number(((usage.inputTokens * rates.input_usd_per_million +
        usage.outputTokens * rates.output_usd_per_million) / 1_000_000).toFixed(12));
      estimatedCostIdr = config.usdIdrRate
        ? Number((estimatedCostUsd * config.usdIdrRate).toFixed(2)) : null;
      pricingStatus = 'estimated';
    } else if (rates && usage.cachedTokens > 0) {
      pricingStatus = 'incomplete_cached_token_pricing';
    } else if (config.configured && !rates) {
      pricingStatus = 'model_rate_missing';
    }
  } catch {
    pricingStatus = 'pricing_config_invalid';
  }
  return {
    request_id: requestId,
    user_id: userId && /^[0-9a-f-]{36}$/i.test(String(userId)) ? userId : null,
    tier_id: ['free', 'lite', 'pro'].includes(String(tierId || '').toLowerCase()) ? String(tierId).toLowerCase() : null,
    feature_id: featureId,
    provider: 'google_gemini',
    model_id: normalizedModel,
    outcome: ['success', 'provider_error', 'quota_error', 'empty_response'].includes(outcome) ? outcome : 'provider_error',
    duration_ms: Math.max(0, Math.min(600_000, Math.round(Number(durationMs) || 0))),
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    thought_tokens: usage.thoughtTokens,
    total_tokens: usage.totalTokens,
    estimated_cost_usd: estimatedCostUsd,
    estimated_cost_idr: estimatedCostIdr,
    pricing_version: pricingVersion,
    pricing_status: pricingStatus,
    error_code: errorCode ? String(errorCode).replace(/[^a-z0-9_.-]/gi, '').slice(0, 80) : null,
    created_at: createdAt
  };
}


export function createMyMemoryUsageEvent({ userId = null, tierId = null, outcome = 'success', durationMs = 0, inputCharacters = 0, requestId = crypto.randomUUID(), errorCode = null, createdAt = new Date().toISOString() } = {}) {
  return {
    request_id: requestId,
    user_id: userId && /^[0-9a-f-]{36}$/i.test(String(userId)) ? userId : null,
    tier_id: ['free', 'lite', 'pro'].includes(String(tierId || '').toLowerCase()) ? String(tierId).toLowerCase() : null,
    feature_id: 'cloud_translation',
    provider: 'mymemory',
    model_id: 'mymemory-default',
    outcome: outcome === 'success' ? 'success' : 'provider_error',
    duration_ms: Math.max(0, Math.min(600_000, Math.round(Number(durationMs) || 0))),
    request_units: 1,
    input_characters: Math.max(0, Math.min(100_000, Math.round(Number(inputCharacters) || 0))),
    input_tokens: null, output_tokens: null, thought_tokens: null, total_tokens: null,
    estimated_cost_usd: null, estimated_cost_idr: null,
    pricing_version: null, pricing_status: 'unpriced',
    error_code: errorCode ? String(errorCode).replace(/[^a-z0-9_.-]/gi, '').slice(0, 80) : null,
    created_at: createdAt
  };
}

export async function persistAIUsageEvents(events, { env = process.env, fetchImpl = fetch, logger = console } = {}) {
  if (!Array.isArray(events) || events.length === 0) return { saved: 0, skipped: true };
  const config = getSupabaseConfig(env);
  if (!config.serviceRoleKey) {
    logger.warn?.('[AI-COST][V342-E] Usage events not persisted: Supabase service role is not configured.');
    return { saved: 0, skipped: true };
  }
  try {
    const response = await fetchImpl(`${config.url}/rest/v1/ai_usage_events`, {
      method: 'POST',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(events),
      signal: AbortSignal.timeout(1800)
    });
    if (!response.ok) {
      logger.warn?.('[AI-COST][V342-E] Usage persistence failed.', { status: response.status });
      return { saved: 0, skipped: false };
    }
    return { saved: events.length, skipped: false };
  } catch (error) {
    logger.warn?.('[AI-COST][V342-E] Usage persistence unavailable.', { code: error?.name || 'unknown' });
    return { saved: 0, skipped: false };
  }
}

export function aggregateAIUsageEvents(events = []) {
  const summary = {
    event_count: events.length,
    estimated_cost_usd: 0,
    estimated_cost_idr: 0,
    priced_event_count: 0,
    unpriced_event_count: 0,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    request_units: 0,
    input_characters: 0,
    by_provider: {},
    by_tier: {},
    by_model: {},
    by_feature: {},
    by_outcome: {},
    by_day: {}
  };
  for (const event of events) {
    const costUsd = event.estimated_cost_usd === null ? null : Number(event.estimated_cost_usd);
    const costIdr = event.estimated_cost_idr === null ? null : Number(event.estimated_cost_idr);
    if (Number.isFinite(costUsd)) { summary.estimated_cost_usd += costUsd; summary.priced_event_count += 1; }
    else summary.unpriced_event_count += 1;
    if (Number.isFinite(costIdr)) summary.estimated_cost_idr += costIdr;
    for (const key of ['input_tokens', 'output_tokens', 'total_tokens', 'request_units', 'input_characters']) summary[key] += Number(event[key]) || 0;
    for (const [bucketName, bucketKey] of [['by_provider', event.provider || 'unknown'], ['by_tier', event.tier_id || 'unknown'], ['by_model', event.model_id || 'unknown'], ['by_feature', event.feature_id || 'unknown'], ['by_outcome', event.outcome || 'unknown'], ['by_day', String(event.created_at || '').slice(0, 10) || 'unknown']]) {
      const bucket = summary[bucketName][bucketKey] ||= { events: 0, estimated_cost_usd: 0, input_tokens: 0, output_tokens: 0 };
      bucket.events += 1;
      if (Number.isFinite(costUsd)) bucket.estimated_cost_usd += costUsd;
      bucket.input_tokens += Number(event.input_tokens) || 0;
      bucket.output_tokens += Number(event.output_tokens) || 0;
    }
  }
  summary.estimated_cost_usd = Number(summary.estimated_cost_usd.toFixed(12));
  summary.estimated_cost_idr = Number(summary.estimated_cost_idr.toFixed(2));
  for (const group of [summary.by_provider, summary.by_tier, summary.by_model, summary.by_feature, summary.by_outcome, summary.by_day]) {
    for (const value of Object.values(group)) value.estimated_cost_usd = Number(value.estimated_cost_usd.toFixed(12));
  }
  return summary;
}
