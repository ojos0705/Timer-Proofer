/** [AI-GENERATED][QA][V342-E] Tests for privacy-safe AI cost telemetry and admin summaries. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseAICostConfig, extractAIUsage, createAIUsageEvent,
  persistAIUsageEvents, aggregateAIUsageEvents
} from '../serverless/api/ai-cost-utils.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261102_ai_cost_monitoring_v342e.sql'), 'utf8');

const pricingEnv = {
  AI_MODEL_PRICING_JSON: JSON.stringify({ version: 'test-v1', models: {
    'gemini-3.8-flash': { input_usd_per_million: 0.1, output_usd_per_million: 0.4 }
  } }),
  AI_USD_IDR_RATE: '16000'
};

test('V342-E parses model pricing and rejects malformed or negative pricing values', () => {
  const config = parseAICostConfig(pricingEnv);
  assert.equal(config.configured, true);
  assert.equal(config.version, 'test-v1');
  assert.equal(config.models['gemini-3.8-flash'].output_usd_per_million, 0.4);
  assert.equal(config.usdIdrRate, 16000);
  assert.equal(parseAICostConfig({}).configured, false);
  assert.throws(() => parseAICostConfig({ AI_MODEL_PRICING_JSON: '{' }), /bukan JSON/);
  assert.throws(() => parseAICostConfig({ AI_MODEL_PRICING_JSON: JSON.stringify({ models: { 'test-model': { input_usd_per_million: -1, output_usd_per_million: 0 } } }) }), /Tarif model/);
});

test('V342-E extracts Gemini usage metadata without storing prompt or response content', () => {
  const usage = extractAIUsage({ usageMetadata: {
    promptTokenCount: 100, candidatesTokenCount: 50, thoughtsTokenCount: 10,
    totalTokenCount: 160, cachedContentTokenCount: 0
  } });
  assert.deepEqual(usage, { inputTokens: 100, outputTokens: 60, thoughtTokens: 10, totalTokens: 160, cachedTokens: 0 });
  assert.deepEqual(extractAIUsage({}), { inputTokens: null, outputTokens: null, thoughtTokens: null, totalTokens: null });
});

test('V342-E estimates cost from server-configured rates and records only bounded metadata', () => {
  const event = createAIUsageEvent({
    userId: '123e4567-e89b-12d3-a456-426614174000', tierId: 'lite', featureId: 'ai_analysis',
    model: 'gemini-3.8-flash', outcome: 'success', durationMs: 1234,
    response: { usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 500, thoughtsTokenCount: 0, totalTokenCount: 1500 } },
    env: pricingEnv, requestId: '123e4567-e89b-12d3-a456-426614174001'
  });
  assert.equal(event.estimated_cost_usd, 0.0003);
  assert.equal(event.estimated_cost_idr, 4.8);
  assert.equal(event.pricing_status, 'estimated');
  assert.equal(event.tier_id, 'lite');
  assert.equal(event.duration_ms, 1234);
  assert.equal(Object.hasOwn(event, 'prompt'), false);
  assert.equal(Object.hasOwn(event, 'response'), false);
  const unpriced = createAIUsageEvent({ featureId: 'ai_tips', model: 'unknown-model', outcome: 'provider_error' });
  assert.equal(unpriced.estimated_cost_usd, null);
  assert.equal(unpriced.pricing_status, 'unpriced');
  assert.throws(() => createAIUsageEvent({ featureId: 'monetization', model: 'x' }), /tidak dikenal/);
});

test('V342-E skips persistence without service-role credentials and safely persists metadata with server credentials', async () => {
  const warnings = [];
  const event = createAIUsageEvent({ featureId: 'ai_telemetry', model: 'gemini-3.8-flash', outcome: 'success' });
  const skipped = await persistAIUsageEvents([event], { env: {}, logger: { warn: (...args) => warnings.push(args) } });
  assert.equal(skipped.skipped, true);
  assert.equal(warnings.length, 1);
  let request;
  const saved = await persistAIUsageEvents([event], {
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-secret' },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 201 };
    }, logger: { warn() {} }
  });
  assert.deepEqual(saved, { saved: 1, skipped: false });
  assert.match(request.url, /ai_usage_events$/);
  assert.equal(request.options.headers.Authorization, 'Bearer server-secret');
  assert.equal(JSON.parse(request.options.body)[0].feature_id, 'ai_telemetry');
  assert.doesNotMatch(request.options.body, /promptContext|secret prompt|response text/);
});

test('V342-E aggregates model, feature and day usage without treating unpriced events as zero-cost', () => {
  const summary = aggregateAIUsageEvents([
    { provider: 'google_gemini', tier_id: 'lite', feature_id: 'ai_analysis', model_id: 'gemini-3.8-flash', created_at: '2026-11-02T01:00:00Z', estimated_cost_usd: 0.001, estimated_cost_idr: 16, input_tokens: 100, output_tokens: 50, total_tokens: 150 },
    { provider: 'mymemory', tier_id: 'free', feature_id: 'ai_tips', model_id: 'gemini-3.6-flash', created_at: '2026-11-02T02:00:00Z', estimated_cost_usd: null, estimated_cost_idr: null, input_tokens: null, output_tokens: null, total_tokens: null }
  ]);
  assert.equal(summary.event_count, 2);
  assert.equal(summary.priced_event_count, 1);
  assert.equal(summary.unpriced_event_count, 1);
  assert.equal(summary.estimated_cost_usd, 0.001);
  assert.equal(summary.by_feature.ai_analysis.events, 1);
  assert.equal(summary.by_tier.lite.events, 1);
  assert.equal(summary.by_tier.free.events, 1);
  assert.equal(summary.by_provider.google_gemini.events, 1);
  assert.equal(summary.by_provider.mymemory.events, 1);
  assert.equal(summary.by_day['2026-11-02'].events, 2);
});

test('V342-E migration keeps AI event ledger private and stores no prompt or response columns', () => {
  assert.match(migration, /create table if not exists public\.ai_usage_events/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.ai_usage_events from public, anon, authenticated/i);
  assert.match(migration, /grant insert, select on table public\.ai_usage_events to service_role/i);
  assert.match(migration, /'google_gemini', 'mymemory'/i);
  assert.match(migration, /input_characters integer/i);
  assert.match(migration, /tier_id text check/i);
  assert.doesNotMatch(migration, /prompt_context|response_text|prompt_text/i);
});

test('V342-E admin summary endpoint is allowlist-protected and clamps the query window', async () => {
  const original = {
    url: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY,
    admins: process.env.AI_COST_ADMIN_USER_IDS
  };
  const adminId = '123e4567-e89b-12d3-a456-426614174000';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon-test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test';
  process.env.AI_COST_ADMIN_USER_IDS = adminId;
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (String(url).endsWith('/auth/v1/user')) return { ok: true, async json() { return { id: adminId }; } };
    return { ok: true, async json() { return [{ feature_id: 'ai_analysis', model_id: 'gemini-3.8-flash', outcome: 'success', estimated_cost_usd: 0.01, estimated_cost_idr: null, created_at: '2026-11-02T00:00:00Z' }]; } };
  };
  try {
    const { default: handler } = await import('../serverless/api/ai-cost-summary.js');
    const result = { statusCode: 200, payload: null, headers: {} };
    const res = {
      setHeader(key, value) { result.headers[key] = value; return this; },
      status(code) { result.statusCode = code; return this; },
      json(payload) { result.payload = payload; return this; },
      end() { return this; }
    };
    await handler({ method: 'GET', headers: { authorization: 'Bearer user-token' }, query: { days: '365' } }, res);
    assert.equal(result.statusCode, 200);
    assert.equal(result.payload.period_days, 90);
    assert.equal(result.payload.summary.estimated_cost_usd, 0.01);
    assert.match(calls[1].url, /limit=1000/);
    assert.equal(calls[1].options.headers.Range, '0-999');
    process.env.AI_COST_ADMIN_USER_IDS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const denied = { statusCode: 200, payload: null, headers: {} };
    const deniedRes = { setHeader(key, value) { denied.headers[key] = value; return this; }, status(code) { denied.statusCode = code; return this; }, json(payload) { denied.payload = payload; return this; }, end() { return this; } };
    await handler({ method: 'GET', headers: { authorization: 'Bearer user-token' }, query: {} }, deniedRes);
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.payload.code, 'AI_COST_ADMIN_REQUIRED');
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries({ SUPABASE_URL: original.url, SUPABASE_ANON_KEY: original.anon, SUPABASE_SERVICE_ROLE_KEY: original.service, AI_COST_ADMIN_USER_IDS: original.admins })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('V342-E records MyMemory request units and character volume but never estimates an unsupported provider fee', async () => {
  const originalFetch = globalThis.fetch;
  const events = [];
  globalThis.fetch = async () => ({
    ok: true, status: 200,
    async json() { return { responseStatus: 200, responseData: { translatedText: 'hasil terjemahan' } }; }
  });
  try {
    const { __test } = await import('../serverless/api/translate.js');
    const result = await __test.fetchMyMemorySegment('uji monitoring biaya unik 20261102', 'en', {
      userId: '123e4567-e89b-12d3-a456-426614174000', tierId: 'free',
      requestId: '123e4567-e89b-12d3-a456-426614174001', usageEvents: events
    });
    assert.equal(result, 'hasil terjemahan');
    assert.equal(events.length, 1);
    assert.equal(events[0].provider, 'mymemory');
    assert.equal(events[0].feature_id, 'cloud_translation');
    assert.equal(events[0].tier_id, 'free');
    assert.equal(events[0].request_units, 1);
    assert.equal(events[0].input_characters, [...'uji monitoring biaya unik 20261102'].length);
    assert.equal(events[0].estimated_cost_usd, null);
    assert.equal(events[0].pricing_status, 'unpriced');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
