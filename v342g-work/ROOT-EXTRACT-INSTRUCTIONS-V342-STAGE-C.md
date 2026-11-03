# V342 Stage C — Root Extract Instructions

1. Back up the currently installed/source V341 or V342 Stage B project first.
2. Extract the ZIP so its root contents (`www/`, `assets/`, `api/`, `supabase/`, `package.json`, etc.) land directly in the project root. Do not nest the extracted folder inside another project directory.
3. Do not copy `.env` files or private keys into a distributable archive. Configure secrets only in the appropriate Vercel environment.
4. Run `npm ci` and `npm test` locally before building.
5. Apply Supabase migrations in order: `20261101_hybrid_monetization_v341.sql`, then `20261102_membership_catalog_v342.sql`.
6. Configure Vercel Preview with the approved Lite/Pro monthly `MONETIZATION_PLANS_JSON` and existing Supabase/Midtrans Sandbox environment variables.
7. Verify API endpoints and complete Sandbox transactions before deploying to Production.
8. For Capacitor, run the project's normal web build and `npx cap sync android` / `npx cap sync ios` only after Preview acceptance.

The product-facing app version remains V125. This archive is technical release V342 Stage C.
