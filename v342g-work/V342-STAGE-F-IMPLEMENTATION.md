# Timer Proofer V342 — Stage F: Admin Finance Dashboard

## Status

Implemented locally on top of V342 Stage E. The dashboard is a separate online-only admin page and does not modify the main app's existing DOM contract or product-facing version V125. It is not deployed and the new Supabase migration has not been applied to a live project.

## Delivered

1. `www/admin-finance.html` — standalone responsive admin dashboard. It reuses the app's `AuthService` session and calls protected server APIs with the user's bearer token. It is `noindex,nofollow` and is not linked into the public app navigation.
2. `api/finance-admin-summary.js` — finance admin endpoint. `GET ?days=7|30|90` aggregates paid/pending/failed/refunded order status, manually recorded expenses, and AI usage. `POST` appends an expense/adjustment with category, IDR amount, evidence level, date, reference and note.
3. `supabase/migrations/20261102_finance_ledger_v342f.sql` — private append-only cost ledger with RLS, no anon/authenticated access, service-role access only.
4. `tests/finance-admin-v342f.test.mjs` — tests access allowlist separation, order aggregation, evidence separation, ledger privacy and dashboard auth/labels.

## Security

- The new endpoint requires a valid Supabase session and a user UUID in server-only `FINANCE_ADMIN_USER_IDS`.
- Finance access is intentionally separate from `AI_COST_ADMIN_USER_IDS`; an AI-cost admin does not automatically become a finance admin.
- The dashboard never receives the Supabase service-role key or Midtrans server key.
- The ledger is not directly writable by anon/authenticated clients. Entries are created through the authenticated admin endpoint, which verifies the allowlist.
- Ledger entries are append-only through the provided API; there is no update/delete endpoint.
- The dashboard page itself is not the security boundary; every data request is authorized server-side.

## Accounting semantics and limits

- `paid_gross_idr` is gross order value, not net settlement revenue.
- Refunded order value is shown separately as `refunded_order_gross_idr` (gross exposure). It is deliberately not deducted from the indicative balance because the current order schema does not prove full vs partial refund cash amounts.
- The indicative balance is paid gross minus recorded expense entries minus priced AI cost estimates. It is not net profit, cash balance, contribution margin, or audited accounting output.
- Payment fees, taxes, infrastructure and provider expenses must be entered from source evidence. Each ledger entry is tagged `actual` or `estimated` and requires a reference.
- AI cost is an estimate based on configured provider rates and available usage metadata, not an invoice.
- `net_margin_available` is always false until provider fees, refunds, taxes, infrastructure, platform/payment charges and all provider invoices are reconciled with complete source data.
- No automatic Midtrans fee rate, tax rate, refund amount, or infrastructure amount is invented.

## Server configuration

Add `FINANCE_ADMIN_USER_IDS` in Vercel Preview as a comma-separated list of authorized Supabase Auth UUIDs. Keep it server-only. Do not copy the IDs into the HTML or client JavaScript.

## Migration order

Apply previous migrations first, then:

1. `20261101_hybrid_monetization_v341.sql`
2. `20261102_membership_catalog_v342.sql`
3. `20261102_feature_access_and_free_trial_v342d.sql`
4. `20261102_ai_cost_monitoring_v342e.sql`
5. `20261102_finance_ledger_v342f.sql`

## Preview acceptance

1. Apply all migrations to a disposable Supabase project.
2. Configure `FINANCE_ADMIN_USER_IDS` in Vercel Preview with a dedicated test admin UUID.
3. Sign in through the main app, then open `/admin-finance.html`.
4. Confirm an allowlisted admin can read summary and a normal authenticated account receives HTTP 403.
5. Record a small estimated cost and a separate actual cost with test references; verify the evidence totals remain separate.
6. Verify paid, pending, failed and refunded order states display separately.
7. Confirm refunded gross exposure is not represented as actual refund cash amount.
8. Confirm unpriced AI events remain visible and the dashboard never labels the indicative balance as net profit.
9. Test 7/30/90-day filters and the 10,000-row truncation warning.
10. Run browser/PWA/Android/iOS regression tests. The dashboard is online-only; the main app remains unchanged.

## Not performed

No live migration, Vercel environment update, deployment, Midtrans reconciliation, provider invoice import, tax/accounting reconciliation, or browser/device end-to-end test was performed.
