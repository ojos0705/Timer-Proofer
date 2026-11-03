# Root Extract Instructions — V342 Stage D

1. Make a backup of the currently installed project/source before replacing files.
2. Extract the ZIP directly into the project root, not into an extra nested folder.
3. Keep existing private environment files outside the archive; the ZIP intentionally excludes `.env`, `.git`, and `node_modules`.
4. Do not deploy to Production yet. Use a Vercel Preview environment and a test Supabase project first.

## Database migration order

Apply these SQL files in order:

1. `supabase/migrations/20261101_hybrid_monetization_v341.sql`
2. `supabase/migrations/20261102_membership_catalog_v342.sql`
3. `supabase/migrations/20261102_feature_access_and_free_trial_v342d.sql`

Do not apply only the V342-D migration to a database that has not received V341 and V342 Stage B.

## Vercel Preview environment

Keep existing required secrets configured server-side:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose to browser)
- `GEMINI_API_KEY` (server only)
- `MONETIZATION_PLANS_JSON` (server-owned plan catalog)
- `MIDTRANS_SERVER_KEY` and `MIDTRANS_CLIENT_KEY` for the existing payment flow
- `MIDTRANS_IS_PRODUCTION=false` for Sandbox

Add `FEATURE_QUOTAS_JSON`. The required structure is documented in `V342-STAGE-D-IMPLEMENTATION.md`. Approve actual daily values for every feature and tier before enabling metered AI endpoints. `null` means unlimited; it is a commercial policy decision, not a default recommendation.

## Manual acceptance checklist

- Sign in using a test account and open Profil → Paket Keanggotaan.
- Verify current tier and per-feature quota status load from the server.
- Verify unauthenticated requests to AI analysis, AI tips, and cloud translation are rejected.
- Verify each feature decrements only its own daily quota.
- Verify a zero quota blocks the first request and exhausted quota returns HTTP 429.
- Verify daily reset is at 00:00 UTC / 07:00 WIB.
- Start Free Trial: confirm Pro tier for exactly 7 days, no payment method, and no payment order created.
- Attempt to claim a second time: confirm the server rejects it.
- Confirm active paid Lite/Pro membership blocks trial start.
- After trial expiry in a test environment, confirm tier resolves to Free and the claim remains consumed.
- Test provider failures after quota reservation; one accepted request attempt is charged even if the upstream provider fails.
- Repeat browser/PWA/Android/iOS UI tests and ensure Profile modal remains scrollable.

## Important quota semantics

- `ai_analysis`, `ai_tips`, and `cloud_translation` are separate counters.
- One validated cloud translation batch consumes one unit; offline glossary translation is not charged by this endpoint.
- Online AI requests require a valid signed-in Supabase session.
- Daily usage resets at 00:00 UTC (07:00 WIB).
- A request that passes auth and quota reservation consumes a unit even if the upstream provider later times out/fails. This is deliberate to prevent parallel requests bypassing limits.
- Free Trial is account-bound and one-time. No device fingerprinting or payment-method identity check is implemented.

Product-facing version remains V125. Technical cache boundary is V342 Stage D.
