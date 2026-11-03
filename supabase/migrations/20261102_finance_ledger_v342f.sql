-- [AI-GENERATED][SECURITY][V342-F]
-- Append-only finance adjustments. Actual provider fees/taxes/infrastructure costs
-- must be entered from source documents; no fee rates are assumed by this schema.
create table if not exists public.monetization_finance_adjustments (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('payment_fee','tax','infrastructure','provider_cost','refund_adjustment','other_cost')),
  amount_idr bigint not null check (amount_idr > 0 and amount_idr <= 1000000000000),
  evidence_level text not null check (evidence_level in ('actual','estimated')),
  reference text not null check (char_length(reference) between 1 and 120),
  note text not null default '' check (char_length(note) <= 500),
  occurred_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists monetization_finance_adjustments_occurred_idx
  on public.monetization_finance_adjustments (occurred_at desc);
alter table public.monetization_finance_adjustments enable row level security;
revoke all on table public.monetization_finance_adjustments from public, anon, authenticated;
grant all on table public.monetization_finance_adjustments to service_role;
