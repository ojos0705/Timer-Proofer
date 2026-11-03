# Root Extract — V342 Stage K

1. Back up the current project and database migration state.
2. Extract the ZIP contents into the project root; do not create an extra nested folder.
3. Confirm `package.json`, `vercel.json`, `api/index.js`, `serverless/api/`, and `scripts/monetization-sandbox-smoke.mjs` are at the project root.
4. Run `npm ci`.
5. Run `npm run` and confirm `test:monetization-sandbox` is listed.
6. Run `npm test`.
7. Commit and push the complete root contents to the connected Git repository.
8. In Vercel Preview, confirm deployment is Ready and the deployment reports one API Serverless Function entrypoint.
9. Smoke-test the existing public API routes, especially payment status, entitlement, translation, AI, weather, and Midtrans notification in Sandbox.

Do not paste secret environment values into source files or chat. Configure them in Vercel project settings. Do not switch `MIDTRANS_IS_PRODUCTION` to true during Sandbox validation.
