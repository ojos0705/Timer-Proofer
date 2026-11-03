# V342 Stage I — Monetization Integration QA

## Scope
Stage I adds an offline integration-test harness for the existing hybrid monetization flow. It deliberately reuses the Stage B–H endpoints, SQL RPCs, plan catalog, entitlement model, quotas, trial, and finance ledger. It does not change the product-facing version (V125), existing application DOM contract, payment prices, or provider configuration.

## Lifecycle covered
1. Authenticated checkout validates a server-owned `plan_id`, writes a pending order, and asks Midtrans Snap for a token using the server-owned price.
2. Snap browser callbacks are treated as UI feedback only; payment state remains server-authoritative.
3. Midtrans webhook signature is checked before any provider/database access.
4. The webhook then fetches Midtrans Get Status, verifies order identity, amount and IDR currency against the immutable server order, and calls the activation RPC only for confirmed `settlement` / acceptable `capture`.
5. Pending, denied, challenged, expired and refunded states do not accidentally grant access. Refunds use the revoke RPC.
6. Payment status and entitlement reads are scoped to the authenticated Supabase user.
7. Free trial is started only through the server RPC with a fixed seven-day duration; client-provided price/duration fields are ignored.
8. Feature quota configuration is validated per tier and per feature; quota consumption is delegated to the atomic database RPC.
9. Migration checks assert RLS and service-role-only writes for payment, entitlement, trial, quota and finance data.

## Test strategy
`tests/monetization-e2e-v342i.test.mjs` runs route-level integration scenarios with mocked Supabase Auth/REST, Midtrans Snap/Status, and RPC responses. It tests the request/response boundaries and security decisions without requiring production credentials or changing live records.

This is **offline mocked integration coverage**, not a live sandbox end-to-end payment. No real Midtrans transaction, Supabase database migration, Vercel deployment, payout report import, browser checkout, Android/iOS device test, or financial close was executed in this stage.

## Required server configuration
Use the Stage B–H deployment configuration and keep all secret values server-side:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_CLIENT_KEY`
- `MIDTRANS_IS_PRODUCTION=false` for sandbox
- `MONETIZATION_PLANS_JSON`
- `FEATURE_QUOTAS_JSON`

Never put `SUPABASE_SERVICE_ROLE_KEY` or `MIDTRANS_SERVER_KEY` in HTML, browser JavaScript, Capacitor client config, or public environment variables.

## Sandbox verification checklist
1. Apply migrations in order from V341 through V342H to a non-production Supabase project.
2. Set Midtrans Sandbox keys and `MIDTRANS_IS_PRODUCTION=false` on the server deployment only.
3. Configure the public HTTPS Payment Notification URL to `/api/midtrans-notification` in Midtrans MAP.
4. Use a test account and create Lite/Pro checkout. Verify the amount shown by Snap equals the server catalog price.
5. Complete one successful sandbox payment using Midtrans simulator credentials. Verify webhook history, `monetization_orders.status=paid`, one entitlement row per order, and account tier change.
6. Send duplicate notification/retry the webhook. Verify no duplicate entitlement or extension occurs for the same order.
7. Test pending, deny, challenge, expire, refund and (if enabled) partial-refund scenarios. Confirm only authoritative provider state changes access.
8. Test another user cannot query the first user's order or entitlement.
9. Test trial once, then attempt again; confirm the database rejects the second claim and the trial expires after seven days without auto-renewal.
10. Consume each feature quota up to its independent limit, test concurrent requests at the boundary, and confirm the next request is denied. Pro `null` limits must remain unlimited only where explicitly configured.
11. Import a real merchant payout CSV only after checking its actual header mapping; verify the Stage H import preview and idempotency before finalizing.
12. Repeat checkout/payment status in installed PWA and Capacitor Android/iOS builds before production approval.

## Known limitations / release gates
- Browser and device checkout flows are not automated in this offline harness.
- Sandbox callbacks and provider notification delivery must be verified in the merchant's own Midtrans sandbox account.
- SQL function concurrency, RLS, grants and trigger behavior require execution against a real isolated Supabase project; static assertions do not replace database tests.
- Partial refunds currently map to the existing `refunded` access state; confirm the desired business policy before enabling partial refunds for paid memberships.
- Stage H payout parser requires validation against an actual redacted payout CSV; XLSX and 7zip extraction are not implemented by this stage.
- Production mode must remain disabled until credentials, notification URL, legal terms, refund policy, store policy, and operational support are approved.

## Versioning
Technical stage: V342 Stage I. Product-facing version remains V125.
