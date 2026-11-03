# Root extract instructions — V342 Stage H
1. Back up the current project and Supabase database.
2. Extract this ZIP at the project root, not inside a nested wrapper folder.
3. Review and apply `supabase/migrations/20261102_payout_fee_import_v342h.sql` in the intended Supabase environment.
4. Confirm `FINANCE_ADMIN_USER_IDS` is configured in Vercel. Do not expose `SUPABASE_SERVICE_ROLE_KEY` in browser variables.
5. Deploy the API and standalone `www/admin-finance.html` together.
6. Download the Midtrans Payout Report from MAP > Billings > Transfer History > Amount (Net). Extract the password-protected 7zip locally and import the CSV (not XLSX) from the internal finance dashboard.
7. First validate against a redacted real report. Check recognized headers, row totals, Order ID matching, duplicate handling, and unallocated rows before treating results as accounting facts.
8. Reconcile totals against the Midtrans portal/bank settlement and preserve the original report securely outside the app.
9. Complete manual browser and device QA; this package does not assert live deployment or device E2E.
