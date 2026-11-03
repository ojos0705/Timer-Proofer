-- [AI-GENERATED][SECURITY][V342-STAGE-B]
-- Multi-plan catalog snapshots and a stable membership summary foundation.
-- Apply after 20261101_hybrid_monetization_v341.sql.

alter table public.monetization_orders
  add column if not exists plan_name text,
  add column if not exists tier_id text,
  add column if not exists billing_period text;

alter table public.user_entitlements
  add column if not exists plan_name text,
  add column if not exists tier_id text,
  add column if not exists billing_period text;

update public.monetization_orders
set plan_name = coalesce(nullif(plan_name, ''), plan_id),
    tier_id = coalesce(nullif(tier_id, ''), plan_id),
    billing_period = coalesce(nullif(billing_period, ''), 'custom')
where plan_name is null or tier_id is null or billing_period is null;

update public.user_entitlements
set plan_name = coalesce(nullif(plan_name, ''), plan_id),
    tier_id = coalesce(nullif(tier_id, ''), plan_id),
    billing_period = coalesce(nullif(billing_period, ''), 'custom')
where plan_name is null or tier_id is null or billing_period is null;

alter table public.monetization_orders
  alter column plan_name set not null,
  alter column tier_id set not null,
  alter column billing_period set not null;

alter table public.user_entitlements
  alter column plan_name set not null,
  alter column tier_id set not null,
  alter column billing_period set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'monetization_orders_billing_period_check') then
    alter table public.monetization_orders
      add constraint monetization_orders_billing_period_check
      check (billing_period in ('monthly', 'annual', 'custom'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_entitlements_billing_period_check') then
    alter table public.user_entitlements
      add constraint user_entitlements_billing_period_check
      check (billing_period in ('monthly', 'annual', 'custom'));
  end if;
end;
$$;

-- Keep older V341 API instances able to create an order during a rolling
-- deployment/rollback window. Missing V342 metadata is derived from plan_id.
create or replace function public.fill_monetization_plan_snapshot()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if nullif(btrim(new.plan_name), '') is null then new.plan_name := new.plan_id; end if;
  if nullif(btrim(new.tier_id), '') is null then new.tier_id := new.plan_id; end if;
  if nullif(btrim(new.billing_period), '') is null then new.billing_period := 'custom'; end if;
  return new;
end;
$$;

drop trigger if exists monetization_orders_fill_plan_snapshot on public.monetization_orders;
create trigger monetization_orders_fill_plan_snapshot
before insert or update of plan_id, plan_name, tier_id, billing_period
on public.monetization_orders
for each row execute function public.fill_monetization_plan_snapshot();

drop trigger if exists user_entitlements_fill_plan_snapshot on public.user_entitlements;
create trigger user_entitlements_fill_plan_snapshot
before insert or update of plan_id, plan_name, tier_id, billing_period
on public.user_entitlements
for each row execute function public.fill_monetization_plan_snapshot();

create or replace function public.confirm_monetization_payment(
  p_order_id text,
  p_provider_transaction_id text,
  p_provider_status text,
  p_paid_at timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.monetization_orders%rowtype;
  v_existing public.user_entitlements%rowtype;
  v_start timestamptz;
  v_expiry timestamptz;
begin
  if coalesce(p_provider_status, '') not in ('settlement', 'capture') then
    raise exception 'Provider status is not a confirmed payment';
  end if;

  select * into v_order
    from public.monetization_orders
    where order_id = p_order_id
    for update;
  if not found then raise exception 'Monetization order not found'; end if;
  if v_order.status = 'refunded' then raise exception 'Refunded order cannot be reactivated'; end if;

  select * into v_existing
    from public.user_entitlements
    where source_order_id = p_order_id
    for update;

  update public.monetization_orders
    set status = 'paid',
        provider_transaction_id = coalesce(p_provider_transaction_id, provider_transaction_id),
        provider_status = p_provider_status,
        paid_at = coalesce(p_paid_at, now()),
        updated_at = now()
    where order_id = p_order_id;

  if v_existing.id is not null then
    if v_existing.status = 'revoked' then raise exception 'Entitlement for this order was revoked'; end if;
    return jsonb_build_object('activated', true, 'idempotent', true, 'entitlement_id', v_existing.id,
      'user_id', v_existing.user_id, 'expires_at', v_existing.expires_at);
  end if;

  -- Serialize activations per account so two concurrent paid orders cannot
  -- calculate overlapping/incorrect membership start dates.
  perform 1 from auth.users where id = v_order.user_id for update;

  select greatest(now(), coalesce(max(expires_at), now())) into v_start
    from public.user_entitlements
    where user_id = v_order.user_id and status = 'active' and expires_at > now();
  v_expiry := v_start + make_interval(days => v_order.duration_days);

  insert into public.user_entitlements (
    user_id, plan_id, plan_name, tier_id, billing_period, status,
    starts_at, expires_at, source_order_id
  ) values (
    v_order.user_id, v_order.plan_id, v_order.plan_name, v_order.tier_id,
    v_order.billing_period, 'active', v_start, v_expiry, p_order_id
  ) returning * into v_existing;

  return jsonb_build_object('activated', true, 'idempotent', false, 'entitlement_id', v_existing.id,
    'user_id', v_existing.user_id, 'expires_at', v_existing.expires_at);
end;
$$;

revoke all on function public.fill_monetization_plan_snapshot() from public, anon, authenticated;
revoke all on function public.confirm_monetization_payment(text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.confirm_monetization_payment(text, text, text, timestamptz) to service_role;
