-- [AI-GENERATED][SECURITY][V341]
-- Server-authoritative digital Premium payments and entitlements.
-- Apply once in the Supabase SQL Editor or through the project's migration runner.
-- No physical bakery orders are stored here. No client role can write these records.

create table if not exists public.monetization_orders (
  order_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  amount bigint not null check (amount > 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  duration_days integer not null check (duration_days between 1 and 3650),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  provider text not null default 'midtrans' check (provider = 'midtrans'),
  provider_transaction_id text,
  provider_status text,
  provider_payment_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists monetization_orders_user_created_idx
  on public.monetization_orders (user_id, created_at desc);
create unique index if not exists monetization_orders_provider_transaction_uidx
  on public.monetization_orders (provider_transaction_id)
  where provider_transaction_id is not null;

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  source_order_id text not null unique references public.monetization_orders(order_id) on delete cascade,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);

create index if not exists user_entitlements_owner_expiry_idx
  on public.user_entitlements (user_id, status, expires_at desc);

alter table public.monetization_orders enable row level security;
alter table public.user_entitlements enable row level security;

-- No anon/authenticated policies are intentionally created. The application server
-- uses SUPABASE_SERVICE_ROLE_KEY; service_role bypasses RLS and is never sent to clients.
revoke all on table public.monetization_orders from public, anon, authenticated;
revoke all on table public.user_entitlements from public, anon, authenticated;
grant all on table public.monetization_orders to service_role;
grant all on table public.user_entitlements to service_role;

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

  if found and v_existing.id is not null then
    if v_existing.status = 'revoked' then raise exception 'Entitlement for this order was revoked'; end if;
    return jsonb_build_object('activated', true, 'idempotent', true, 'entitlement_id', v_existing.id,
      'user_id', v_existing.user_id, 'expires_at', v_existing.expires_at);
  end if;

  select greatest(now(), coalesce(max(expires_at), now())) into v_start
    from public.user_entitlements
    where user_id = v_order.user_id and status = 'active' and expires_at > now();
  v_expiry := v_start + make_interval(days => v_order.duration_days);

  insert into public.user_entitlements (user_id, plan_id, status, starts_at, expires_at, source_order_id)
    values (v_order.user_id, v_order.plan_id, 'active', v_start, v_expiry, p_order_id)
    returning * into v_existing;

  return jsonb_build_object('activated', true, 'idempotent', false, 'entitlement_id', v_existing.id,
    'user_id', v_existing.user_id, 'expires_at', v_existing.expires_at);
end;
$$;

create or replace function public.revoke_monetization_entitlement(
  p_order_id text,
  p_reason text default 'refund'
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entitlement public.user_entitlements%rowtype;
begin
  update public.monetization_orders
    set status = 'refunded', updated_at = now(), provider_status = coalesce(p_reason, 'refund')
    where order_id = p_order_id;

  update public.user_entitlements
    set status = 'revoked', revoked_at = now(), revoke_reason = left(coalesce(p_reason, 'refund'), 80)
    where source_order_id = p_order_id
    returning * into v_entitlement;

  return jsonb_build_object('revoked', found, 'order_id', p_order_id);
end;
$$;

revoke all on function public.confirm_monetization_payment(text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.revoke_monetization_entitlement(text, text) from public, anon, authenticated;
grant execute on function public.confirm_monetization_payment(text, text, text, timestamptz) to service_role;
grant execute on function public.revoke_monetization_entitlement(text, text) to service_role;
