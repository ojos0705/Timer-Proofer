# Manual Device & Sandbox QA — V341

## Preflight
- [ ] Apply `supabase/migrations/20261101_hybrid_monetization_v341.sql` in the intended Supabase project.
- [ ] Configure Vercel Preview env vars: Supabase URL/anon/service-role, Midtrans server/client keys, `MIDTRANS_IS_PRODUCTION=false`, and one active `MONETIZATION_PLANS_JSON` plan.
- [ ] Confirm service-role and Midtrans server keys do not appear in built assets, source maps, logs, or APK contents.
- [ ] Configure Midtrans Sandbox notification URL to `/api/midtrans-notification`.
- [ ] Deploy to Preview and confirm all five API routes return JSON, not HTML 404 pages.

## Authentication and catalog
- [ ] Signed-out checkout is rejected with HTTP 401.
- [ ] Signed-in user receives the server plan catalog and correct IDR amount.
- [ ] Invalid/expired Supabase token is rejected.
- [ ] Catalog with no active plan or more than one active plan fails closed.

## Checkout
- [ ] Tap BAYAR SEKARANG from PWA and Android Capacitor.
- [ ] Verify request sends Bearer token and `plan_id`, but no `gross_amount` or client order ID.
- [ ] Verify database order belongs to the authenticated Supabase user and uses server price/duration.
- [ ] Complete a Sandbox pending payment and confirm order remains pending until provider status is verified.
- [ ] Complete a Sandbox settlement and confirm order becomes paid and entitlement is created.
- [ ] Verify browser callback alone does not activate Premium.

## Webhook and entitlement security
- [ ] Invalid signature returns 401 and creates no entitlement.
- [ ] Unknown order returns 404 and creates no entitlement.
- [ ] Mismatched provider amount/currency returns 400 and creates no entitlement.
- [ ] Duplicate settlement notification does not create duplicate entitlement.
- [ ] `capture` with `fraud_status=challenge` does not activate entitlement.
- [ ] Confirmed refund/chargeback revokes the entitlement associated with that order.
- [ ] User A cannot query User B's order ID or entitlements.
- [ ] Direct anon/authenticated table writes fail under RLS.

## PWA and Android regression
- [ ] Login/register/logout still work.
- [ ] Existing Settings, Terms, Tour, notification, recipe detail, photo upload/preview, timer, alarm, PiP, translation and offline boot regressions remain clear.
- [ ] Checkout label says Premium application membership and no longer conflates physical bakery orders.
- [ ] PWA and installed Android display the same server-configured price.
- [ ] Run `npm ci`, `npm test`, `npm run sync:android`, `:app:assembleDebug`, then install and test on a physical device.

## Store billing review
- [ ] Before shipping a digital subscription in Google Play or Apple App Store, implement/review the billing flow required by each store. Midtrans-only checkout is not assumed compliant for store-distributed digital goods.
