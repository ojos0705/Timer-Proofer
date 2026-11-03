# Root Extract Instructions — V342 Stage E

1. Back up the installed source before replacing it.
2. Extract the ZIP directly into the project root (not into an additional nested folder).
3. Keep `.env`, `.git`, `node_modules`, and private signing credentials outside the archive.
4. Do not deploy to Production until the migration, server variables, Preview checks, and billing reconciliation are complete.

## Supabase migration order

1. `supabase/migrations/20261101_hybrid_monetization_v341.sql`
2. `supabase/migrations/20261102_membership_catalog_v342.sql`
3. `supabase/migrations/20261102_feature_access_and_free_trial_v342d.sql`
4. `supabase/migrations/20261102_ai_cost_monitoring_v342e.sql`

## Vercel Preview variables

- Existing: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`.
- `AI_COST_ADMIN_USER_IDS`: comma-separated Supabase Auth UUID allowlist.
- `AI_MODEL_PRICING_JSON`: server-only model price table. Use rates matching the project's actual provider billing tier; see `V342-STAGE-E-IMPLEMENTATION.md`.
- `AI_USD_IDR_RATE`: optional manually maintained IDR-per-USD snapshot. Omit it if not yet verified.

Never put service-role keys, provider API keys, or administrator allowlists in frontend code.

## Admin endpoint

`GET /api/ai-cost-summary?days=30` with a valid Supabase bearer token. Only UUIDs in `AI_COST_ADMIN_USER_IDS` can read the summary. The endpoint is not a graphical dashboard.

## Acceptance

- Verify Gemini token usage and fallback events.
- Verify MyMemory request/character counts and cache-hit exclusion.
- Verify admin returns 200 and non-admin returns 403.
- Verify missing/unknown pricing is marked unpriced.
- Reconcile estimates against provider invoices; never use estimates as exact billable totals.
- Run `npm test` and browser/PWA/Android/iOS regression tests.
