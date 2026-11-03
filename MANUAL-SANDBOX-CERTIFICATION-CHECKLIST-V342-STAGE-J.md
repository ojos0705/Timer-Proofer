# Manual Sandbox Certification Checklist — V342 Stage J

Use a dedicated Midtrans Sandbox merchant environment, Supabase staging project, Vercel Preview deployment, and dedicated test account. Never use production Server Key or production database for these tests.

## Before payment
- [ ] `MIDTRANS_IS_PRODUCTION=false` in server-only environment.
- [ ] Midtrans Server Key is Sandbox (`SB-...`); Client Key is the matching Sandbox key.
- [ ] Supabase URL/service role points to staging; migrations V341–V342H applied and checked.
- [ ] Vercel Preview URL uses HTTPS and staging environment variables.
- [ ] Midtrans MAP Sandbox Payment Notification URL points to `/api/midtrans-notification` on the Preview URL.
- [ ] App catalog price and Snap checkout amount match exactly.

## Successful Lite and Pro transactions
- [ ] Create and complete one Lite Sandbox payment using the Midtrans simulator.
- [ ] Confirm Midtrans transaction status `settlement` (or supported accepted `capture`).
- [ ] Confirm webhook returns HTTP 200 and server logs do not expose secrets.
- [ ] Confirm exactly one paid order and one entitlement for the order.
- [ ] Confirm account entitlement is active for the purchased `plan_id`.
- [ ] Run `npm run test:monetization-sandbox` with the paid order and test-user token.
- [ ] Repeat with a Pro Sandbox payment.

## Negative, duplicate, refund, and isolation tests
- [ ] Pending payment does not grant entitlement.
- [ ] Denied, challenged, expired, and cancelled payments do not grant entitlement.
- [ ] Invalid signature is rejected before provider/database work.
- [ ] Duplicate notification does not create a duplicate entitlement or extend expiry twice.
- [ ] Unknown order, wrong amount, wrong currency, and mismatched provider order ID are rejected.
- [ ] Another user cannot read the first user's order or entitlement.
- [ ] Full refund revokes access according to approved policy.
- [ ] Partial refund behavior is verified only after written product/finance policy approval.
- [ ] Trial can be claimed once, lasts seven days, and does not auto-renew.
- [ ] Each feature quota is enforced independently, including concurrent boundary requests.

## Operational and device checks
- [ ] Verify webhook retries and provider/API outage behavior.
- [ ] Verify order status refresh and entitlement refresh after app relaunch.
- [ ] Test browser, installed PWA, Android Capacitor, and iOS Capacitor.
- [ ] Verify app remains usable offline and payment actions clearly require connectivity.
- [ ] Record deployment commit, environment, UTC timestamps, redacted order IDs, and outcomes.

## Go-live approval
- [ ] Finance validates real payout report and fees.
- [ ] Legal approves terms, refund policy, and user disclosures.
- [ ] Support and incident response are ready.
- [ ] Production keys and production mode are enabled only in a separate, explicitly approved release.
