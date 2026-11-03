# Timer Proofer V342 — Stage D: Feature Entitlements, Per-Feature Quotas & Free Trial

## Status

**Implemented locally. Full automated release suite passed (556/556). Not deployed and not production-ready until quota values, Supabase migration, Preview environment, and device tests are completed.**

Baseline: V342 Stage C. Product-facing version remains V125; technical cache/build version remains within V342.

## Implemented

1. Server-authoritative access control for `ai_analysis`, `ai_tips`, and `cloud_translation`.
   - Each online AI endpoint requires a verified Supabase user session.
   - Each feature has an independent daily counter; translation counts one validated cloud-translation batch per endpoint request.
   - Quota checks and increments are atomic in Supabase RPC, not browser/local storage.
   - Offline/local glossary translation is not charged by this cloud endpoint quota.
   - The tier is resolved from active server entitlement; the browser cannot submit a tier or quota limit.
2. Configurable tier limits through `FEATURE_QUOTAS_JSON`.
   - Required keys for each of `free`, `lite`, and `pro`: `ai_analysis`, `ai_tips`, `cloud_translation`.
   - Each entry uses `{ "limit": integer }` (0–2,147,483,647); `null` means unlimited. Limits reset at 00:00 UTC (07:00 WIB).
   - No commercial quota numbers were invented in this implementation. The environment variable must be populated with approved values before enabling online AI features in Preview/Production. Missing/invalid configuration fails closed for quota-protected endpoints.
3. One-time Free Trial Pro for exactly 7 days.
   - Requires a verified account; no payment method is collected.
   - Database unique constraint prevents a second claim by the same account, including after expiry.
   - Trial creates a Pro-tier entitlement with `billing_period='trial'`, separate from paid order references.
   - Trial never creates a payment order and has no auto-renewal; entitlement expires naturally and the account resolves to Free.
   - Trial cannot start while a paid Lite/Pro entitlement is active.
4. Membership page integration.
   - Adds trial eligibility/status and per-feature remaining quota display.
   - Trial action is disabled when the account is not eligible or status cannot be verified.
5. Existing package checkout and product-facing version V125 are preserved.

## Required environment configuration

Set `FEATURE_QUOTAS_JSON` in Vercel Preview first. Schema (replace every `REPLACE_WITH_APPROVED_INTEGER` with the approved daily allowance; use `null` only when that tier is intentionally unlimited):

```json
{
  "free": {
    "ai_analysis": { "limit": REPLACE_WITH_APPROVED_INTEGER },
    "ai_tips": { "limit": REPLACE_WITH_APPROVED_INTEGER },
    "cloud_translation": { "limit": REPLACE_WITH_APPROVED_INTEGER }
  },
  "lite": {
    "ai_analysis": { "limit": REPLACE_WITH_APPROVED_INTEGER },
    "ai_tips": { "limit": REPLACE_WITH_APPROVED_INTEGER },
    "cloud_translation": { "limit": REPLACE_WITH_APPROVED_INTEGER }
  },
  "pro": {
    "ai_analysis": { "limit": null },
    "ai_tips": { "limit": null },
    "cloud_translation": { "limit": null }
  }
}
```

This is a schema illustration, not an approved production quota table. Pro unlimited values are likewise a configuration choice and must be approved before deployment.

## Database migration

Apply after both prior migrations, in this order:

1. `supabase/migrations/20261101_hybrid_monetization_v341.sql`
2. `supabase/migrations/20261102_membership_catalog_v342.sql`
3. `supabase/migrations/20261102_feature_access_and_free_trial_v342d.sql`

The new migration makes paid `source_order_id` nullable for trial entitlements, adds a unique one-time trial claim table, adds daily per-feature usage counters, and grants the trial/quota RPCs to `service_role` only.

## Security and accounting notes

- Quota is reserved when the authenticated request passes access checks, before the upstream provider runs. A provider timeout or provider-side failure after reservation still consumes that request's quota. This prevents parallel requests from bypassing the cap but should be considered when finalizing customer-facing quota policy.
- Daily quota reset is UTC midnight.
- Cloud translation is charged per validated batch, not per character or individual UI text node. Provider-level MyMemory limits remain independent.
- `ai-telemetry` is not metered as a customer AI feature.
- Trial claim is account-bound; this implementation does not attempt device fingerprinting or payment-method identity checks.

## Not performed

- No live Supabase migration was applied.
- No Vercel environment variable was changed.
- No Preview/Production deployment was made.
- No paid/trial account was tested against a real Supabase project.
- No browser/PWA/Android/iOS visual interaction test was performed here.
- Actual daily quota amounts still require explicit approval.
