# Timer Proofer V342 — Stage G: Midtrans Reconciliation & Tier Economics

## Status

Implemented locally on top of V342 Stage F. Product-facing version remains V125. Existing app index markup and public DOM contracts were not changed; the finance dashboard remains a separate admin-only page.

## Delivered

1. `api/finance-midtrans-reconcile.js` — admin-only POST endpoint that reads paid/refunded orders (maximum 200 per run), requests each order's status from Midtrans using the server key, validates order ID, gross amount and IDR currency, and stores a normalized reconciliation snapshot.
2. `api/finance-reconciliation-utils.js` — pure helpers for safe IDR parsing, tier reconciliation and AI cost grouping by tier.
3. `supabase/migrations/20261102_midtrans_reconciliation_v342g.sql` — private, order-keyed snapshot table with RLS. Upsert by order makes repeated sync idempotent.
4. `api/finance-admin-summary.js` — adds per-tier settlement/refund/AI cost information and unverified-order counts.
5. `www/admin-finance.html` — adds a manual Midtrans reconciliation action and per-tier table.
6. `tests/finance-midtrans-reconcile-v342g.test.mjs` — validates identity/amount/currency, refund evidence, tier calculations, AI cost attribution, private storage, dashboard behavior, and denied admin access.

## Reconciliation rules

- Order ID and gross amount must exactly match the server-created order; currency must be IDR.
- A transaction counts as settled when Midtrans reports `settlement`, `refund`, `partial_refund`, `chargeback`, `partial_chargeback`, or a settlement timestamp. `capture` alone is not counted as settled funds.
- Midtrans `refund_amount` is recorded as provider-acknowledged cumulative refund.
- Refund amounts are considered bank-confirmed only when a refund detail contains `bank_confirmed_at`.
- The dashboard displays acknowledged and bank-confirmed refunds separately. Net before costs deducts only bank-confirmed refund amounts.
- Midtrans transaction status does not provide merchant MDR/payout fee amounts. These remain manual ledger entries backed by Midtrans Payout Report.
- AI cost is an estimate from configured token rates and FX; unpriced events remain explicitly counted.
- Per-tier AI cost is displayed, but net margin is unavailable until payment fees, tax, refunds, provider invoices, infrastructure and other costs are reconciled and attributed to the relevant order/tier.

## Security

- Uses the existing server-only `FINANCE_ADMIN_USER_IDS` allowlist. It is independent from `AI_COST_ADMIN_USER_IDS`.
- Uses `MIDTRANS_SERVER_KEY` only in the server endpoint; never exposed to dashboard HTML.
- The snapshot table has RLS enabled and denies public/anon/authenticated table access. Service role is the only database writer/reader.
- Each sync is capped at 200 orders to limit provider/API load. Failed orders are reported individually and do not invalidate successful snapshots.
- Snapshots are upserted by `order_id`; no raw card data, customer PII, or server credentials are stored.

## Migration order

Apply prior V341, V342-B, V342-D, V342-E and V342-F migrations, then:

`supabase/migrations/20261102_midtrans_reconciliation_v342g.sql`

No new environment variables are required beyond the Stage F `FINANCE_ADMIN_USER_IDS` and existing `MIDTRANS_SERVER_KEY` / Supabase server credentials.

## Preview acceptance

1. Apply migrations to a disposable Supabase project in the order above.
2. Deploy to Vercel Preview with a dedicated test UUID in `FINANCE_ADMIN_USER_IDS` and Midtrans Sandbox server key.
3. Sign in as admin and open `/admin-finance.html`.
4. Run reconciliation for 7 days with at least one sandbox order. Confirm the endpoint validates the gross amount and stores one snapshot.
5. Run reconciliation again; confirm the same `order_id` is upserted rather than duplicated.
6. Test partial refund with and without `bank_confirmed_at`; verify acknowledged and bank-confirmed totals remain distinct.
7. Confirm a non-admin gets HTTP 403 before any database/provider call.
8. Compare payout fee values with Midtrans Payout Report; record actual MDR only from the report.
9. Confirm per-tier AI costs do not assign costs to unknown/unpriced tiers and net margin remains unavailable.
10. Run browser/PWA/Android/iOS regression tests.

## Not performed

No live Midtrans API call, real payout report import, live database migration, Vercel deployment, financial close, or browser/device end-to-end test was performed. Unit and static release tests use local fixtures only.
