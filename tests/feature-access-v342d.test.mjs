import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFeatureQuotaConfig, consumeFeatureQuota } from '../serverless/api/feature-access-utils.js';
import startFreeTrial from '../serverless/api/start-free-trial.js';
import featureAccess from '../serverless/api/feature-access.js';

const FEATURE_QUOTAS = Object.fromEntries(['free', 'lite', 'pro'].map((tier) => [tier, {
  ai_analysis: { limit: tier === 'free' ? 2 : null },
  ai_tips: { limit: tier === 'free' ? 3 : null },
  cloud_translation: { limit: tier === 'free' ? 10 : null }
}]));

function responseStub() {
  return { statusCode: 200, headers: {}, body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }, end() { return this; }
  };
}

const originalFetch = globalThis.fetch;
const originalEnv = Object.fromEntries(['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'FEATURE_QUOTAS_JSON'].map((key) => [key, process.env[key]]));
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
process.env.FEATURE_QUOTAS_JSON = JSON.stringify(FEATURE_QUOTAS);

test('feature quota denial is surfaced with the feature-specific 429 code', async () => {
  globalThis.fetch = async (url) => {
    assert.match(String(url), /rpc\/consume_feature_quota/);
    return { ok: true, async text() { return JSON.stringify({ allowed: false, limit: 2, used: 2, remaining: 0 }); } };
  };
  try {
    await assert.rejects(consumeFeatureQuota('123e4567-e89b-12d3-a456-426614174000', 'ai_analysis'),
      (error) => error.code === 'FEATURE_QUOTA_EXCEEDED' && error.status === 429 && error.limit === 2);
  } finally { globalThis.fetch = originalFetch; }
});

test('AI analysis endpoint rejects unauthenticated requests before reserving feature quota', async () => {
  const { default: aiAnalyze } = await import('../serverless/api/ai-analyze.js');
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  globalThis.fetch = async () => ({ ok: false, status: 401, async json() { return {}; } });
  try {
    const res = responseStub();
    await aiAnalyze({ method: 'POST', headers: {}, body: { promptContext: 'Test access gate' } }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'MONETIZATION_AUTH_REQUIRED');
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});

test('feature quota configuration requires independent limits for each tier and feature', () => {
  const parsed = parseFeatureQuotaConfig({ FEATURE_QUOTAS_JSON: JSON.stringify(FEATURE_QUOTAS) });
  assert.equal(parsed.free.ai_analysis.limit, 2);
  assert.equal(parsed.pro.cloud_translation.limit, null);
  assert.throws(() => parseFeatureQuotaConfig({ FEATURE_QUOTAS_JSON: '{}' }), (error) => error.code === 'FEATURE_QUOTAS_CONFIG_INVALID');
  assert.throws(() => parseFeatureQuotaConfig({ FEATURE_QUOTAS_JSON: '' }), (error) => error.code === 'FEATURE_QUOTAS_NOT_CONFIGURED');
});

test('Free Trial endpoint requires a verified login and asks the database for a one-time 7-day claim', async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/auth/v1/user')) return { ok: true, async json() { return { id: '123e4567-e89b-12d3-a456-426614174000' }; } };
    if (String(url).includes('/rpc/start_free_trial')) return { ok: true, async text() { return JSON.stringify({ started: true, duration_days: 7, auto_renew: false, payment_method_required: false }); } };
    throw new Error(`Unexpected URL ${url}`);
  };
  try {
    const res = responseStub();
    await startFreeTrial({ method: 'POST', headers: { authorization: 'Bearer valid-session' }, body: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.trial.duration_days, 7);
    assert.equal(res.body.trial.auto_renew, false);
    assert.equal(calls.length, 2);
    assert.deepEqual(JSON.parse(calls[1].options.body), { p_user_id: '123e4567-e89b-12d3-a456-426614174000', p_duration_days: 7 });
  } finally { globalThis.fetch = originalFetch; }
});

test('feature access endpoint returns Free tier quotas and trial eligibility from server records', async () => {
  globalThis.fetch = async (url) => {
    const address = String(url);
    if (address.includes('/auth/v1/user')) return { ok: true, async json() { return { id: '123e4567-e89b-12d3-a456-426614174000' }; } };
    if (address.includes('/user_entitlements?')) return { ok: true, async text() { return '[]'; } };
    if (address.includes('/free_trial_claims?')) return { ok: true, async text() { return '[]'; } };
    if (address.includes('/feature_usage_daily?')) return { ok: true, async text() { return JSON.stringify([{ feature_id: 'ai_analysis', used_count: 1 }]); } };
    throw new Error(`Unexpected URL ${url}`);
  };
  try {
    const res = responseStub();
    await featureAccess({ method: 'GET', headers: { authorization: 'Bearer valid-session' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.tier, 'free');
    assert.equal(res.body.features.ai_analysis.remaining, 1);
    assert.equal(res.body.trial.eligible, true);
  } finally { globalThis.fetch = originalFetch; }
});

test('V342-D migration enforces unique one-time trial, daily per-feature counters and service-role-only RPCs', async () => {
  const { readFile } = await import('node:fs/promises');
  const sql = await readFile(new URL('../supabase/migrations/20261102_feature_access_and_free_trial_v342d.sql', import.meta.url), 'utf8');
  assert.match(sql, /user_id uuid not null unique references auth\.users/i);
  assert.match(sql, /primary key \(user_id, feature_id, usage_date\)/i);
  assert.match(sql, /if v_limit = 0 then[\s\S]*'allowed', false/i);
  assert.match(sql, /user_entitlements_source_trial_fk/i);
  assert.match(sql, /p_duration_days (?:<>|is distinct from) 7/i);
  assert.match(sql, /auto_renew', false/i);
  assert.match(sql, /grant execute on function public\.start_free_trial[\s\S]*to service_role/i);
  assert.match(sql, /grant execute on function public\.consume_feature_quota[\s\S]*to service_role/i);
});

test.after(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
