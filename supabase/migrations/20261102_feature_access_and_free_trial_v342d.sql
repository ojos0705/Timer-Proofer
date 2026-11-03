-- [AI-GENERATED][SECURITY][V342-D]
-- Server-authoritative per-feature daily quotas and one-time 7-day Pro trial.
-- Apply after V341 and V342 Stage B migrations.

-- Trial entitlements are not payment orders. Keep paid source_order_id nullable and
-- use a separate unique trial reference so payment foreign keys remain intact.
alter table public.user_entitlements alter column source_order_id drop not null;
alter table public.user_entitlements add column if not exists source_trial_id uuid;
create unique index if not exists user_entitlements_source_trial_uidx
  on public.user_entitlements(source_trial_id) where source_trial_id is not null;

alter table public.user_entitlements drop constraint if exists user_entitlements_billing_period_check;
alter table public.user_entitlements add constraint user_entitlements_billing_period_check
  check (billing_period in ('monthly', 'annual', 'custom', 'trial'));

create table if not exists public.free_trial_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  tier_id text not null default 'pro' check (tier_id = 'pro'),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > started_at)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_entitlements_source_trial_fk') then
    alter table public.user_entitlements
      add constraint user_entitlements_source_trial_fk
      foreign key (source_trial_id) references public.free_trial_claims(id) on delete cascade;
  end if;
end;
$$;

create table if not exists public.feature_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_id text not null check (feature_id in ('ai_analysis', 'ai_tips', 'cloud_translation')),
  usage_date date not null default (timezone('utc', now())::date),
  used_count integer not null default 0 check (used_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature_id, usage_date)
);

alter table public.free_trial_claims enable row level security;
alter table public.feature_usage_daily enable row level security;
revoke all on table public.free_trial_claims from public, anon, authenticated;
revoke all on table public.feature_usage_daily from public, anon, authenticated;
grant all on table public.free_trial_claims to service_role;
grant all on table public.feature_usage_daily to service_role;

create or replace function public.start_free_trial(p_user_id uuid, p_duration_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.free_trial_claims%rowtype;
  v_paid boolean;
  v_start timestamptz := now();
  v_expiry timestamptz;
  v_claim_id uuid;
  v_entitlement_id uuid;
begin
  if p_duration_days is distinct from 7 then raise exception 'Free trial duration must be exactly 7 days'; end if;
  perform 1 from auth.users where id = p_user_id for update;
  if not found then raise exception 'User not found'; end if;

  select * into v_existing from public.free_trial_claims where user_id = p_user_id for update;
  if found then
    return jsonb_build_object('started', false, 'reason', 'already_claimed', 'started_at', v_existing.started_at, 'expires_at', v_existing.expires_at);
  end if;

  select exists(
    select 1 from public.user_entitlements
    where user_id = p_user_id and status = 'active'
      and expires_at > now() and coalesce(tier_id, plan_id) in ('lite', 'pro')
  ) into v_paid;
  if v_paid then return jsonb_build_object('started', false, 'reason', 'paid_membership_active'); end if;

  v_expiry := v_start + interval '7 days';
  insert into public.free_trial_claims(user_id, tier_id, started_at, expires_at)
    values (p_user_id, 'pro', v_start, v_expiry) returning id into v_claim_id;
  insert into public.user_entitlements(
    user_id, plan_id, plan_name, tier_id, billing_period, status,
    starts_at, expires_at, source_order_id, source_trial_id
  ) values (
    p_user_id, 'pro-trial', 'Free Trial Pro 7 Hari', 'pro', 'trial', 'active',
    v_start, v_expiry, null, v_claim_id
  ) returning id into v_entitlement_id;

  return jsonb_build_object('started', true, 'trial_id', v_claim_id,
    'entitlement_id', v_entitlement_id, 'tier_id', 'pro',
    'started_at', v_start, 'expires_at', v_expiry, 'duration_days', 7,
    'auto_renew', false, 'payment_method_required', false);
end;
$$;

create or replace function public.consume_feature_quota(
  p_user_id uuid,
  p_feature_id text,
  p_quota_config jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tier text := 'free';
  v_limit integer;
  v_has_limit boolean;
  v_date date := timezone('utc', now())::date;
  v_used integer;
  v_resets timestamptz := ((timezone('utc', now())::date + 1)::timestamp at time zone 'utc');
begin
  if p_feature_id not in ('ai_analysis', 'ai_tips', 'cloud_translation') then
    raise exception 'Unknown feature id';
  end if;

  select coalesce(tier_id, plan_id, 'free') into v_tier
    from public.user_entitlements
    where user_id = p_user_id and status = 'active'
      and starts_at <= now() and expires_at > now()
    order by expires_at desc limit 1;
  v_tier := coalesce(v_tier, 'free');
  if v_tier not in ('free', 'lite', 'pro') then v_tier := 'free'; end if;

  v_has_limit := (p_quota_config #> array[v_tier, p_feature_id]) ? 'limit';
  if coalesce(v_has_limit, false) = false then raise exception 'Feature quota configuration is incomplete'; end if;
  if jsonb_typeof(p_quota_config #> array[v_tier, p_feature_id, 'limit']) = 'null' then
    return jsonb_build_object('allowed', true, 'tier', v_tier, 'limit', null, 'used', null,
      'remaining', null, 'resets_at', null, 'unlimited', true);
  end if;
  v_limit := (p_quota_config #>> array[v_tier, p_feature_id, 'limit'])::integer;
  if v_limit < 0 then raise exception 'Feature quota limit cannot be negative'; end if;
  if v_limit = 0 then
    select used_count into v_used from public.feature_usage_daily
      where user_id = p_user_id and feature_id = p_feature_id and usage_date = v_date;
    return jsonb_build_object('allowed', false, 'tier', v_tier, 'limit', 0,
      'used', coalesce(v_used, 0), 'remaining', 0, 'resets_at', v_resets, 'unlimited', false);
  end if;

  insert into public.feature_usage_daily(user_id, feature_id, usage_date, used_count, updated_at)
    values (p_user_id, p_feature_id, v_date, 1, now())
    on conflict (user_id, feature_id, usage_date)
    do update set used_count = public.feature_usage_daily.used_count + 1, updated_at = now()
      where public.feature_usage_daily.used_count < v_limit
    returning used_count into v_used;

  if v_used is null then
    select used_count into v_used from public.feature_usage_daily
      where user_id = p_user_id and feature_id = p_feature_id and usage_date = v_date;
    return jsonb_build_object('allowed', false, 'tier', v_tier, 'limit', v_limit,
      'used', coalesce(v_used, 0), 'remaining', 0, 'resets_at', v_resets, 'unlimited', false);
  end if;
  return jsonb_build_object('allowed', true, 'tier', v_tier, 'limit', v_limit,
    'used', v_used, 'remaining', greatest(0, v_limit - v_used), 'resets_at', v_resets, 'unlimited', false);
end;
$$;

revoke all on function public.start_free_trial(uuid, integer) from public, anon, authenticated;
revoke all on function public.consume_feature_quota(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.start_free_trial(uuid, integer) to service_role;
grant execute on function public.consume_feature_quota(uuid, text, jsonb) to service_role;
