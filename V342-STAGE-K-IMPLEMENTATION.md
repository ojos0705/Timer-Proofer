# V342 Stage K — Vercel Hobby Function Consolidation

## Scope
- Preserve product-facing version V125.
- Consolidate Vercel auto-discovered API functions into a single `api/index.js` entrypoint.
- Move canonical endpoint handlers and helper modules to `serverless/api/` so Vercel does not count each source module as a separate function.
- Preserve the public `/api/<endpoint>` URLs using a Vercel rewrite.
- Preserve the Stage J sandbox smoke-test script and its read-only behavior.

## Routing
`vercel.json` rewrites `/api/:path*` to `/api/index?route=:path*`. The router dispatches to the original 17 handler modules. Existing request methods, request bodies, authorization headers, and endpoint query parameters continue to be passed to the original handler.

## Why the missing npm script occurred
The Stage J archive's root `package.json` already contains `test:monetization-sandbox`. The `Missing script` error therefore indicates the command was run from a different project directory or a checkout that did not contain the Stage J `package.json`. Verify with `Get-Location`, `npm run`, and `Test-Path .\scripts\monetization-sandbox-smoke.mjs`.

## Validation
See `QA-TEST-LOG-V342-STAGE-K.txt`. This archive does not deploy to Vercel and does not certify the live Sandbox merchant. Verify the deployment preview after pushing this archive.
