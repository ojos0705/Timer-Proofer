# V342 Stage H — Midtrans Payout Fee Import & Unit Economics

## Implemented
- Admin-only `POST /api/finance-payout-import`, protected by the dedicated `FINANCE_ADMIN_USER_IDS` allowlist and Supabase session verification.
- CSV import path for a locally extracted Midtrans Payout Report. The browser parser handles quoted CSV cells, BOM, row validation, common fee/order/date/payment-type headers (date required for period summaries); separate MDR and transaction-fee columns are imported independently when no combined fee column exists, and a 5 MB/5,000-row ceiling, localized IDR parsing, and explicit Indonesian DD/MM/YYYY date interpretation in WIB.
- Server-side validation of IDR amounts, fee categories, order ID syntax, dates, and report references. No provider credentials are sent to the browser.
- `monetization_payout_fee_entries` private append-only fact ledger with SHA-256 row fingerprint uniqueness. Re-importing the same normalized row is ignored.
- Order ID matching against internal orders snapshots `plan_id` and `tier_id`. Rows without order IDs and unmatched order IDs remain explicitly unallocated/unmatched; no proportional allocation is fabricated.
- Finance summary includes imported payout fees by category/tier, matching quality, and per-tier contribution before AI/other costs. Imported payout fees replace manually entered `payment_fee` in the indicative balance calculation to reduce duplicate counting; other manually recorded costs and AI estimates remain included.
- Product version remains V125. Main app DOM contract is not modified; only standalone noindex finance admin page and finance APIs/migration/tests/docs are changed.

## Report handling and limits
Midtrans documents that Payout Report is delivered as a password-protected 7zip archive with CSV or XLSX report files. The admin must download it from MAP > Billings > Transfer History > Amount (Net), extract it locally, then import CSV. Password-protected archive extraction is deliberately not implemented in the web app. XLSX is not yet supported.

Midtrans documentation describes transaction/order identifiers, gross amount, fee/MDR and payout fee concepts, but the exact Payout Report CSV header layout is not fully specified in the public guide. Therefore the importer uses known header aliases and fails closed if a fee column is not recognized; it does not silently guess a numeric column. Before production import, validate against a real, redacted merchant report and extend header aliases if required.

## Accounting safeguards
- No hardcoded MDR rates or fee percentages.
- Imported fee values are treated as actual report data, not a modelled fee estimate.
- Currency is IDR only. Negative/invalid amounts are rejected.
- Fees with no order ID are recorded but not allocated to Lite/Pro.
- A tier contribution is not net profit: refunds, tax, infrastructure, provider invoices, chargebacks, payout timing, and all other cost completeness still matter.
- The current CSV mapper defaults fee category to `payment_fee` unless an explicit fee type column identifies tax/transfer/other. Verify source semantics before relying on that category breakdown.
- No raw customer names, emails, phone numbers, account numbers, or original report rows are persisted. Imported row references retain only file/line identifiers for auditability.

## Migration
Apply `supabase/migrations/20261102_payout_fee_import_v342h.sql` in Supabase before enabling the endpoint in deployment.

## Environment
No new environment variable. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only and maintain `FINANCE_ADMIN_USER_IDS` with verified admin UUIDs.

## Not performed
No live Midtrans report was imported; no merchant sample was available to validate the exact CSV schema; no live Supabase migration, Vercel deployment, financial close, or browser/PWA/Android/iOS end-to-end test was performed.
