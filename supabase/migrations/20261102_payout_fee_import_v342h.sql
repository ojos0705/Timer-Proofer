-- [AI-GENERATED][SECURITY][V342-H]
-- Imported fee facts only; no assumed MDR rates and no raw customer data.
create table if not exists public.monetization_payout_fee_entries (
  id uuid primary key default gen_random_uuid(),
  source_row_hash text not null unique check (length(source_row_hash) = 64),
  order_id text references public.monetization_orders(order_id) on delete set null,
  plan_id text,
  tier_id text,
  order_matched boolean not null default false,
  fee_category text not null check (fee_category in ('payment_fee','tax','transfer_fee','other_fee')),
  amount_idr bigint not null check (amount_idr >= 0),
  gross_amount_idr bigint check (gross_amount_idr is null or gross_amount_idr >= 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  occurred_at timestamptz,
  payout_reference text,
  source_reference text,
  payment_type text,
  imported_by uuid not null,
  imported_at timestamptz not null default now()
);
create index if not exists monetization_payout_fee_entries_tier_date_idx on public.monetization_payout_fee_entries (tier_id, occurred_at desc);
create index if not exists monetization_payout_fee_entries_order_idx on public.monetization_payout_fee_entries (order_id);
alter table public.monetization_payout_fee_entries enable row level security;
revoke all on table public.monetization_payout_fee_entries from public, anon, authenticated;
grant all on table public.monetization_payout_fee_entries to service_role;
