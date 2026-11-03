# Root-extract instructions — V342 Stage G

1. Back up the current project directory.
2. Extract the ZIP contents directly into the project root; do not create a nested wrapper directory.
3. Apply migrations in order: V341, V342-B, V342-D, V342-E, V342-F, then `20261102_midtrans_reconciliation_v342g.sql`.
4. Keep `FINANCE_ADMIN_USER_IDS`, `MIDTRANS_SERVER_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` server-only in Vercel Preview.
5. Deploy Preview and open `/admin-finance.html` after signing in as an allowlisted admin.
6. Click Rekonsiliasi Midtrans for a small test period (7 days) and verify successful order snapshots and error rows.
7. Compare fees against the Midtrans Payout Report; do not estimate MDR from the transaction status response.
8. Do not deploy Production until sandbox tests and browser/device regression tests pass.

Product-facing app version remains V125. This is technical release V342 Stage G.
