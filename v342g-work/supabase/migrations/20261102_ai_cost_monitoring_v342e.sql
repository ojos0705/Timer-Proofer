-- [AI-GENERATED][OBSERVABILITY][V342-E]
-- Provider-level AI usage ledger. Stores metadata/token counts only; never prompt or response text.

create table if not exists public.ai_usage_events (
  id bigint generated always as identity primary key,
  request_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  tier_id text check (tier_id is null or tier_id in ('free', 'lite', 'pro')),
  feature_id text not null check (feature_id in ('ai_analysis', 'ai_tips', 'ai_telemetry', 'cloud_translation')),
  provider text not null check (provider in ('google_gemini', 'mymemory')),
  model_id text not null,
  outcome text not null check (outcome in ('success', 'provider_error', 'quota_error', 'empty_response')),
  duration_ms integer not null default 0 check (duration_ms between 0 and 600000),
  request_units integer check (request_units is null or request_units >= 0),
  input_characters integer check (input_characters is null or input_characters >= 0),
  input_tokens bigint check (input_tokens is null or input_tokens >= 0),
  output_tokens bigint check (output_tokens is null or output_tokens >= 0),
  thought_tokens bigint check (thought_tokens is null or thought_tokens >= 0),
  total_tokens bigint check (total_tokens is null or total_tokens >= 0),
  estimated_cost_usd numeric(20,12),
  estimated_cost_idr numeric(20,2),
  pricing_version text,
  pricing_status text not null default 'unpriced' check (pricing_status in ('estimated', 'unpriced', 'model_rate_missing', 'incomplete_cached_token_pricing', 'pricing_config_invalid')),
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_created_idx on public.ai_usage_events (created_at desc);
create index if not exists ai_usage_events_feature_created_idx on public.ai_usage_events (feature_id, created_at desc);
create index if not exists ai_usage_events_model_created_idx on public.ai_usage_events (model_id, created_at desc);
create index if not exists ai_usage_events_user_created_idx on public.ai_usage_events (user_id, created_at desc) where user_id is not null;

alter table public.ai_usage_events enable row level security;
revoke all on table public.ai_usage_events from public, anon, authenticated;
grant insert, select on table public.ai_usage_events to service_role;
grant usage, select on sequence public.ai_usage_events_id_seq to service_role;
