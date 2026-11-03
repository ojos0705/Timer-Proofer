# Root-extract instructions — V342 Stage F

1. Back up the existing project directory.
2. Extract the ZIP contents directly into the project root (do not create a nested wrapper directory).
3. Review the new migration `supabase/migrations/20261102_finance_ledger_v342f.sql` and apply it only after V341, V342-B, V342-D and V342-E on a test Supabase project.
4. Add `FINANCE_ADMIN_USER_IDS` to Vercel Preview as a server-only comma-separated list of Supabase Auth UUIDs.
5. Deploy to Preview, sign in through the main app, then open `/admin-finance.html`.
6. Verify admin and non-admin access, record test costs, and reconcile all figures against provider source documents before relying on them.
7. Do not deploy to Production until the manual acceptance plan passes.

The app-facing version remains V125. This technical release is V342 Stage F.
