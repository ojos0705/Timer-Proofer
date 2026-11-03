# Hybrid Monetization — Timer Proofer V341

## Scope shipped in this source package

V341 adds a server-authoritative foundation for **digital Premium membership** on the PWA and Capacitor clients:

- The signed-in Supabase identity is verified by the Supabase Auth `/user` endpoint for every user-scoped payment/status request.
- Plan price, currency, and duration are loaded from the server-only `MONETIZATION_PLANS_JSON` catalog. The browser sends only `plan_id`; client-supplied amount and order IDs are ignored/rejected.
- A unique order is generated on the server and persisted before a Midtrans Snap token is requested.
- Midtrans notifications require a valid SHA-512 signature and a successful server-to-server Get Status check. The provider amount and currency are cross-checked against the stored server order.
- Premium entitlement activation is performed only by a Supabase database RPC after a confirmed `settlement` or accepted `capture` status. The database function is idempotent and prevents client-role writes.
- Refund/chargeback statuses revoke the entitlement originating from that order.
- Users can read only their own order status and entitlements through authenticated endpoints.
- The existing profile checkout now obtains the active plan from the API and submits a Supabase Bearer token. The UI never decides the amount.
- The checkout label now identifies a digital app membership, not a bakery physical-goods order.

Product-facing version remains **V125**. Technical release is **V341**. Existing HTML IDs, modal IDs, element structure, and event-dispatch contracts are retained.

## API endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/monetization-catalog` | GET | Public active Premium plan catalog |
| `/api/create-payment-token` | POST | Authenticated order creation and Midtrans Snap token |
| `/api/midtrans-notification` | POST | Verify provider notification and activate/revoke entitlement |
| `/api/payment-status?order_id=...` | GET | Read an order belonging to the authenticated user |
| `/api/my-entitlements` | GET | Read entitlements belonging to the authenticated user |

## Required Supabase migration

Apply `supabase/migrations/20261101_hybrid_monetization_v341.sql` to the project's Supabase database before enabling the new checkout. It creates:

- `public.monetization_orders`
- `public.user_entitlements`
- `public.confirm_monetization_payment(...)`
- `public.revoke_monetization_entitlement(...)`

Both tables have RLS enabled and intentionally have no `anon`/`authenticated` policies. Only the server's service-role connection can read/write them. The service-role key must never be included in browser files, app config, or mobile binaries.

## Vercel environment variables

Set these in Vercel Project Settings → Environment Variables for Preview first:

- `SUPABASE_URL` — existing project's Supabase URL (optional; source default is the current app project).
- `SUPABASE_ANON_KEY` — existing Supabase public anon key (optional; source fallback matches the V340 auth module).
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role secret; server only, required.
- `MIDTRANS_SERVER_KEY` — Midtrans server key; server only, required.
- `MIDTRANS_CLIENT_KEY` — Midtrans public client key; also required by the server configuration check.
- `MIDTRANS_IS_PRODUCTION` — set to `false` for Sandbox; only set to `true` after live readiness checks.
- `MONETIZATION_PLANS_JSON` — JSON array containing the commercial plan details. Exactly one plan must have `active: true` for the current single-checkout-card UI. Example structure (replace the placeholder values with the approved business price and duration):

```json
[
  {
    "id": "premium-monthly",
    "name": "Premium Bulanan",
    "amount": 59000,
    "currency": "IDR",
    "duration_days": 30,
    "period_label": "30 hari",
    "active": true
  }
]
```

The amount above is an illustrative example only, **not a recommended or pre-approved price**. Set the final amount and duration according to the product decision. `currency` is fixed to IDR by the server. Recurring/automatic billing is not implemented.

## Midtrans Sandbox setup

Set the Payment Notification URL in the Midtrans dashboard to:

`https://timer-proofer.vercel.app/api/midtrans-notification`

Use the Sandbox dashboard and test credentials first. In `www/index.html`, replace the public `data-client-key="YOUR_CLIENT_KEY"` value on `meta[name="midtrans-snap-config"]` with the same Sandbox Client Key and keep `data-environment="sandbox"`. The Client Key is public; never place the Server Key in HTML. Deploy to Vercel Preview and verify the exact Preview domain and endpoint routing before Production. Keep `MIDTRANS_IS_PRODUCTION=false` while testing. For Production, set the live Server/Client keys, `MIDTRANS_IS_PRODUCTION=true`, and the meta tag to the live Client Key plus `data-environment="production"`.

## Deployment order

1. Back up the current V340 working directory and keep local secrets out of the ZIP.
2. Apply the Supabase SQL migration.
3. Configure the Vercel Preview environment variables, including the final plan JSON.
4. Configure the Midtrans Sandbox notification URL.
5. Deploy this V341 source to Preview.
6. Test signup/login, catalog, checkout, pending, settlement, invalid signature, mismatched amount, duplicate notification, and refund.
7. Verify `/api/my-entitlements` only returns the signed-in user's own records.
8. Only after Preview QA, configure Production credentials/environment and deploy Production.

## Explicitly not claimed as complete

- The migration has **not** been applied to the live Supabase project from this workspace.
- Vercel environment variables and Midtrans dashboard settings have **not** been changed from this workspace.
- No real payment, sandbox dashboard transaction, refund, or live transaction has been executed here.
- Existing application-wide feature gates have not yet been migrated to server entitlement checks. The V341 endpoint and entitlement foundation is ready for that next integration stage; hiding a UI control is not a security boundary.
- AdSense/AdMob, Google Play Billing, and Apple In-App Purchase are not integrated. Store-distributed digital subscriptions must be reviewed against the applicable platform billing rules before release.
- Physical bakery goods/orders are deliberately outside this digital Premium membership flow.
- Physical-device Gradle/iOS build and visual QA remain manual tasks.

## Security notes

- Do not restore the old client-supplied `gross_amount` checkout contract.
- Never put `SUPABASE_SERVICE_ROLE_KEY` or `MIDTRANS_SERVER_KEY` in `www/`, `assets/`, Capacitor configuration, or a committed `.env` file.
- Entitlement activation must be driven by the verified webhook/RPC, never by the browser's Snap `onSuccess` callback or localStorage.
- A successful Snap callback is not treated as proof of Premium access; the UI queries the authenticated server order status.


## V342 Stage B — multi-plan catalog and membership foundation

The V342 Stage B source introduces the following backend changes while preserving the V341 checkout security contract:

- `MONETIZATION_PLANS_JSON` accepts 1–20 unique plan IDs and more than one active plan.
- Public catalog returns active plans ordered by `display_order`; each plan includes `tier_id`, `tier_name`, and `billing_period` (`monthly`, `annual`, or `custom`).
- `POST /api/create-payment-token` now resolves the submitted `plan_id` against the active server catalog. The browser still cannot set the amount, currency, duration, tier, or order ID.
- Order and entitlement records snapshot `plan_name`, `tier_id`, and `billing_period` so later catalog edits do not rewrite membership history.
- `GET /api/my-entitlements` now returns a normalized `membership` summary: either the active membership details or the Free state. `GET /api/payment-status` also returns the plan snapshot fields.
- The payment-confirmation RPC serializes entitlement activation per account by locking the matching `auth.users` row before calculating the next membership start time.

### New migration

Apply `supabase/migrations/20261102_membership_catalog_v342.sql` **after** the V341 migration. It adds the membership snapshot fields and replaces the payment-confirmation RPC. The migration is designed to preserve existing V341 orders and entitlements by backfilling their metadata from `plan_id`.

### Example server catalog

The approved monthly prices can be configured as follows. Annual plans should remain `active: false` until their prices are formally approved; do not publish the illustrative annual price used in automated tests.

```json
[
  {
    "id": "lite-monthly",
    "name": "Lite Bulanan",
    "tier_id": "lite",
    "tier_name": "Lite",
    "billing_period": "monthly",
    "amount": 19900,
    "duration_days": 30,
    "period_label": "30 hari",
    "display_order": 10,
    "active": true
  },
  {
    "id": "pro-monthly",
    "name": "Pro Bulanan",
    "tier_id": "pro",
    "tier_name": "Pro",
    "billing_period": "monthly",
    "amount": 49900,
    "duration_days": 30,
    "period_label": "30 hari",
    "display_order": 20,
    "active": true
  }
]
```

### Scope not yet completed

- The Paket page still uses the V341 single-checkout-card UI; selecting Lite/Pro and monthly/annual visually is a later frontend stage. Until then, the existing client chooses the first active catalog item.
- The annual price points are not finalized and must not be activated in the server catalog yet.
- Free trial, per-feature AI quota enforcement, and cross-feature entitlement gates are not implemented in this stage.
- The migration has not been applied to the user's Supabase project, Vercel variables have not been changed, and no Midtrans transaction has been executed.
