# Timer Proofer V342 — Stage C: Membership Package UI

## Status

**Frontend source implementation completed locally. Automated release and regression checks passed. Production readiness is not yet established.**

Baseline: V342 Stage B source. Product-facing version remains `V125`; technical build/cache token advances to `es6-modular-v342` / `20261102-v342`.

## What changed

1. Rebuilt the Paket Keanggotaan area inside the existing Profil modal.
   - Adds a Free baseline card.
   - Renders active paid packages from `GET /api/monetization-catalog`.
   - Uses server-provided names, tier labels, duration, and price; text is inserted with `textContent` rather than HTML interpolation.
   - Hides annual plans from selection until annual prices are approved; the annual selector is visibly disabled.
   - Adds a refresh action for the catalog and membership status.
2. Added current membership status.
   - Reads `GET /api/my-entitlements` with the active Supabase Bearer token.
   - Shows the current tier and expiry/days remaining when the server confirms an active entitlement.
   - Shows a neutral verification message if the endpoint is unavailable; it does not assume Premium is active.
3. Reworked checkout summary.
   - Shows selected plan, duration, price, discount, and total.
   - The discount line is Rp0 because the current server catalog has no promotion/discount fields; no discount is fabricated.
   - The amount is sourced from the public server catalog. The browser sends only `plan_id` and customer details to checkout.
   - Checkout requires a selected plan and a valid signed-in Supabase session.
4. Preserved existing integration contracts.
   - Retained `.payment-checkout-container`, `#pay-total-amount`, and `data-action="mulaiTransaksiMidtrans"`.
   - Added only new IDs inside the existing Profil modal; no existing IDs were renamed or removed.
   - Existing delegated event handling resolves the new `loadMembershipPackages` and `pilihPaketKeanggotaan` actions through the established window action registry.
5. Advanced the technical cache boundary to V342 and Service Worker cache `Timer-Proofing-v1.1.244`; the visible product version stays V125.

## Server catalog configuration

Configure the Vercel Preview environment variable `MONETIZATION_PLANS_JSON` with the approved monthly plans. Example:

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

These amounts reflect the approved monthly prices. Keep annual plans out of the active catalog until annual prices are approved. The UI also filters out `billing_period: "annual"` as a second guard. Do not activate multiple package options in Production until the Supabase migrations, Vercel Preview configuration, and Midtrans Sandbox flow have been verified.

## Verification

- `npm test`: **550 passed, 0 failed**.
- Static release verifier: passed.
- JavaScript syntax/release scan: 291 JavaScript files checked.
- Entrypoint module graph: 69 local modules; 0 missing imports.
- Service Worker precache: 80 entries; no missing local assets.
- HTML: 2 files, 314 IDs, 0 duplicate IDs.
- Inline event handlers: 0.
- Scroll-lock overrides: 0.
- Duplicate function declarations within the same module: 0.
- Existing cross-module repeated function names: 18 informational findings, unchanged in meaning.
- New UI contract tests: 5 passed.

## Not performed — required before Production

- No Supabase migration was applied to the live project. Apply V341 migration first, then `supabase/migrations/20261102_membership_catalog_v342.sql`.
- No Vercel environment variables were changed or deployed.
- No Midtrans Sandbox transaction was executed.
- No live browser/PWA/Android/iOS visual interaction test was executed in this environment.
- Existing Free trial policy (7 days, one-time eligible account, no payment method, no auto-charge) is not activated by this UI stage; it still requires backend eligibility and entitlement implementation.
- Annual billing, automatic renewal, Google Play Billing, and Apple In-App Purchase remain out of scope.

## Manual acceptance sequence

1. Deploy to Vercel Preview only after applying both Supabase migrations to a non-production/test database and configuring Preview environment variables.
2. Sign in with a test account and open Profil → Paket Keanggotaan.
3. Confirm Free, Lite, and Pro cards appear from the catalog; confirm amounts are Rp19.900 and Rp49.900 and annual selection remains disabled.
4. Select Lite, then Pro; verify the package name, 30-day period, subtotal, Rp0 discount, and total update each time.
5. Refresh the page and confirm the selection/catalog is reloaded safely.
6. Confirm current membership status and expiry are taken from `/api/my-entitlements` after a test payment is confirmed server-side.
7. Complete a Midtrans Sandbox transaction for each plan; confirm webhook verification and entitlement activation before any Production rollout.
8. Repeat on installed PWA and Android Capacitor. Test narrow screens and ensure the package cards/checkout remain scrollable and do not overlap other profile content.

## Release files

- `Timer-Proofer-ES6-Modular-V342-Stage-C-ROOT-EXTRACT.zip`
- `Timer-Proofer-ES6-Modular-V342-Stage-C-SHA256.txt`
- `QA-TEST-LOG-V342-STAGE-C.txt`
