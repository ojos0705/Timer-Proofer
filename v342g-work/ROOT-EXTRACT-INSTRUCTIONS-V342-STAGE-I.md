# Root Extract Instructions — V342 Stage I

1. Back up the current project directory and database schema before replacing files.
2. Extract the ZIP directly into the project root (not into a nested wrapper folder).
3. Preserve local `.env*`, `.vercel`, `.git`, Android signing files, and any production secrets; these are not shipped in the archive.
4. Review `V342-STAGE-I-IMPLEMENTATION.md` and the V341–V342H migration sequence before applying database migrations.
5. Run `npm ci` if dependencies need restoration, then `npm test`.
6. Apply SQL migrations only to an isolated Supabase test project first, in dependency order.
7. Configure Midtrans Sandbox server/client keys as server-side environment variables and keep `MIDTRANS_IS_PRODUCTION=false`.
8. Deploy to a non-production Vercel environment, configure the HTTPS notification URL, then follow the sandbox checklist.
9. Do not enable production payments until sandbox, database, browser, PWA and native-device verification is complete.

The product-facing app version remains V125. Stage I does not run migrations or deploy services automatically.
