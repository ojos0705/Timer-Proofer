-- [AI-GENERATED][SECURITY][V342-G]
-- Stores verified Midtrans status/refund snapshots. This is NOT a payout/MDR ledger.
create table if not exists public.monetization_provider_reconciliations (
  order_id text primary key references public.monetization_orders(order_id) on delete cascade,
  provider_transaction_id text,
  provider_status text,
  payment_type text,
  gross_amount_idr bigint not null check (gross_amount_idr >= 0),
  refund_amount_idr bigint not null default 0 check (refund_amount_idr >= 0),
  bank_confirmed_refund_amount_idr bigint not null default 0 check (bank_confirmed_refund_amount_idr >= 0),
  settlement_time timestamptz,
  refund_details jsonb not null default '[]'::jsonb check (jsonb_typeof(refund_details) = 'array'),
  synced_at timestamptz not null default now(),
  check (refund_amount_idr <= gross_amount_idr),
  check (bank_confirmed_refund_amount_idr <= refund_amount_idr)
);
create index if not exists monetization_provider_reconciliations_synced_idx
  on public.monetization_provider_reconciliations (synced_at desc);
alter table public.monetization_provider_reconciliations enable row level security;
revoke all on table public.monetization_provider_reconciliations from public, anon, authenticated;
grant all on table public.monetization_provider_reconciliations to service_role;
