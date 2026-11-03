# Timer Proofer V342 — Stage E: AI Cost Monitoring & Usage Optimization

## Status

**Implemented locally. Full automated release suite passed (566/566). Not deployed and not production-ready until the V342-E migration, server configuration, and provider reconciliation are completed.**

Baseline: V342 Stage D. Product-facing version remains V125. This stage is primarily server/API-side; the PWA UI and existing DOM contract are not changed.

## Implemented

1. **Gemini usage telemetry**
   - Each logical model invocation records endpoint feature, model ID, outcome, duration, Gemini usage metadata (input, candidate output, thinking and total tokens), and a request correlation UUID.
   - Model fallback attempts are recorded separately, including quota/provider errors where no token usage is available.
   - The event is recorded after provider execution; it never stores prompts, generated text, system instructions, API keys, bearer tokens, or provider response payloads.
2. **Configurable cost estimation**
   - `AI_MODEL_PRICING_JSON` stores server-owned input/output USD rates per million tokens and a pricing version.
   - `AI_USD_IDR_RATE` is an optional operator-maintained exchange-rate snapshot. If absent, USD estimates remain available and IDR remains null.
   - A missing model rate, missing token metadata, cached-token usage without a separate cached-input rate, or invalid pricing configuration is marked unpriced/incomplete; the system does not invent a zero cost.
   - Thinking tokens are included in billed output tokens for the current text-only Gemini request path.
3. **MyMemory usage telemetry**
   - Each actual upstream MyMemory segment request (cache misses only) records request count, source character count, duration, and success/failure.
   - No MyMemory monetary price is assumed. It remains `unpriced` until a documented provider cost/contract is configured.
   - Existing 24-hour translation cache is retained; cache hits do not create upstream usage events.
4. **Private event ledger**
   - New table `public.ai_usage_events` stores provider metadata and usage counts only.
   - RLS is enabled. `public`, `anon`, and `authenticated` have no table access; server `service_role` performs writes/reads.
   - No prompt or response text columns exist.
5. **Admin-only summary API**
   - `GET /api/ai-cost-summary?days=30` returns totals and groupings by provider, tier, model, feature, outcome, and UTC day; window is clamped to 1–90 days and results to 10,000 events.
   - Requires a valid Supabase user session and a matching UUID in `AI_COST_ADMIN_USER_IDS`.
   - This stage supplies a protected summary API, not a graphical admin dashboard.
6. **Failure isolation**
   - Usage persistence is best-effort and bounded to 1.8 seconds. Failure to write telemetry must not replace a successful/failed AI or translation response.
   - Supabase service-role credentials remain server-only.

## Vercel Preview configuration

Required existing server variables include `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY`.

Add `AI_COST_ADMIN_USER_IDS` with comma-separated Supabase Auth user UUIDs authorized to view the summary endpoint. Do not use email addresses or expose this variable to the client.

Add `AI_MODEL_PRICING_JSON` only after checking the billing tier and current official model price. Example schema for the **Standard Paid Tier** reference prices visible on the official Google pricing page on 2026-11-02:

```json
{
  "version": "google-standard-paid-2026-11-02",
  "models": {
    "gemini-3.6-flash": {
      "input_usd_per_million": 1.50,
      "output_usd_per_million": 7.50
    },
    "gemini-3.5-flash-lite": {
      "input_usd_per_million": 0.30,
      "output_usd_per_million": 2.50
    }
  }
}
```

These values are a reference example for the Google **Paid / Standard** tier, not an assumption about the project's actual billing account. Google's pricing page lists free and paid tiers separately. Verify the actual billing tier before using this example. The currently configured first fallback model `gemini-3.8-flash` does not have a matching price entry in the retrieved official pricing table; its events intentionally remain `model_rate_missing` until an authoritative rate is confirmed. Never copy a rate from a different model or inference tier.

Optional `AI_USD_IDR_RATE` is a manually maintained IDR-per-USD snapshot. It is not automatically refreshed and should include the date/source in the operator's configuration record.

Official reference: https://ai.google.dev/gemini-api/docs/pricing

## Database migration order

Apply all prior migrations first, then:

1. `supabase/migrations/20261101_hybrid_monetization_v341.sql`
2. `supabase/migrations/20261102_membership_catalog_v342.sql`
3. `supabase/migrations/20261102_feature_access_and_free_trial_v342d.sql`
4. `supabase/migrations/20261102_ai_cost_monitoring_v342e.sql`

Do not apply V342-E alone to a database missing its earlier dependencies.

## Admin endpoint

```http
GET /api/ai-cost-summary?days=30
Authorization: Bearer <Supabase user access token>
```

The user UUID must be listed in `AI_COST_ADMIN_USER_IDS`. Unlisted users receive HTTP 403. The endpoint does not return user IDs, prompts, response bodies, contact email, or provider credentials.

## Interpretation and accounting limits

- Estimated Gemini cost is derived from usage metadata and the configured price table. It is **not an invoice or exact provider charge**.
- The SDK can retry internally; this telemetry records the logical model invocation/fallback attempt visible to this application, not every hidden HTTP retry made inside the SDK.
- Failed provider requests may have incurred cost even when usage metadata is unavailable; such events are unpriced rather than treated as free.
- Gemini cached-token pricing is not calculated by this first version; those events are marked incomplete until a separate cached-input rate is configured.
- MyMemory request/character counts are operational usage metrics only; no monetary fee is inferred.
- This stage does not calculate net subscription margin. Payment fees, refunds, taxes, platform fees, infrastructure costs, and provider invoices must be reconciled before displaying profit/margin as actual.
- No live Supabase migration, Vercel environment update, deployment, or provider billing reconciliation was performed.

## Manual Preview acceptance

1. Apply migrations V341, V342-B, V342-D, then V342-E to a disposable/test Supabase project.
2. Set the server environment variables in Vercel Preview; set `AI_COST_ADMIN_USER_IDS` to a dedicated test administrator UUID.
3. Make one successful AI analysis and AI tips request; verify Gemini usage events contain token counts when provider metadata is returned.
4. Force a model fallback/provider failure; verify each visible fallback attempt is recorded without prompt/response content.
5. Make a MyMemory translation with a cache miss; verify request unit and character count. Repeat it; verify cache hit does not create another MyMemory event.
6. Request the summary as an allowlisted admin (200) and as an ordinary authenticated user (403).
7. Verify an absent price entry remains unpriced and never reports a fabricated zero charge.
8. Reconcile the period against Google AI Studio / provider billing data before using the estimate for package pricing or margin decisions.
9. Repeat browser, installed PWA, Android Capacitor, and iOS tests. This stage does not alter UI/DOM, but end-to-end regression testing is still required.
