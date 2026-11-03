# Timer Proofer V334 — Root Extract Instructions

## Basis

V334 is built from the V333 source archive uploaded for this work. Product-facing version remains `V125`; V334 is the technical release/cache revision.

## Apply the source

1. Back up `C:\xampp\htdocs\proofing-donat-baru` or create a safe Git commit/branch first.
2. Extract the contents of this ZIP directly into `C:\xampp\htdocs\proofing-donat-baru` (root extract; do not create a nested V334 folder).
3. Preserve local-only files and settings. Do not overwrite or commit `.git`, `.env`, `android/local.properties`, signing keys, keystores, or any private credentials.
4. Run PowerShell:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm ci
npm test
git diff --check
git status --short
```

5. Review the complete diff and ensure no secrets or local machine files are staged.
6. Push V334 to the Preview branch and test the Preview deployment before merging it into `main`/Production.

## Free online translation provider

V334 uses the MyMemory API through the Vercel serverless route `/api/translate`. No Google Cloud Billing, Google API key, or payment card is required by this route.

- Anonymous MyMemory allowance: 5,000 translated characters/day.
- MyMemory documents up to 50,000 characters/day when a valid contact email is sent using the `de` parameter.
- To use the higher allowance, optionally add Vercel environment variable `MYMEMORY_CONTACT_EMAIL` with a valid contact email address. Configure it for Preview and Production, then redeploy.
- The email is passed to MyMemory as the contact/developer address. Use an address you are comfortable sharing with that provider. It is not an API key.
- Without the environment variable, the service remains usable under the anonymous 5,000-character daily limit.
- There is no unlimited hosted free tier guarantee. MyMemory may limit traffic or may not support every source/target pair. The language picker shows local candidates, not a guarantee that every pair works.
- MyMemory's documented `q` limit is 500 UTF-8 bytes; V334 splits text below that limit and keeps request batches bounded.
- User-authored recipe/profile content is excluded from automatic translation. Only application UI text and safe attributes are sent to the provider.

Official provider references:
- https://mymemory.translated.net/doc/usagelimits.php
- https://mymemory.translated.net/doc/spec.php
- https://mymemory.translated.net/terms-and-conditions

## Translation request path and troubleshooting

Browser/PWA or Capacitor WebView -> same-origin Vercel `/api/translate` -> Supabase JWT validation -> MyMemory API. The WebView does not call MyMemory directly, so MyMemory CORS is not the browser boundary.

If translation fails:
- `API_ROUTE_NOT_FOUND`: latest `/api/translate` route is not deployed or the Vercel output configuration does not include it.
- `API_NETWORK_ERROR`: the WebView cannot reach the Vercel endpoint; verify internet and the API base URL in the installed APK.
- `TRANSLATION_AUTH_INVALID`: sign in again so the API receives a valid Supabase session.
- `TRANSLATION_UNSUPPORTED_LANGUAGE`: MyMemory does not support that Indonesian-to-target pair.
- `TRANSLATION_QUOTA_EXCEEDED`: the provider's daily free allowance was reached. Reuse cached strings, wait for reset, or optionally configure `MYMEMORY_CONTACT_EMAIL` for the documented higher daily allowance.
- `TRANSLATION_NETWORK_ERROR` / `TRANSLATION_UPSTREAM_ERROR`: Vercel received the request but could not obtain a valid MyMemory response; inspect Vercel Function Logs and retry later.

The provider adapter and API tests use mocked network responses in this environment. A live external MyMemory request, Vercel deployment, and physical-device translation test still need to be run by the project owner.

## Android build and install

After the latest web/backend source is on the selected Preview/Production deployment:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm run sync:android
cd android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug
```

For a Capacitor APK that uses the Production API, the updated `/api/translate` backend must also be deployed to `https://timer-proofer.vercel.app` before the device test.

## Manual validation

- Welcome Screen remains unchanged.
- Test onboarding on short/tall Android viewports and verify swipe does not reveal half of the neighboring card.
- Test Login and Register on phone portrait/landscape and with the keyboard open. The mobile auth panel should fill the WebView viewport edge-to-edge, with safe-area padding and internal scrolling when needed.
- Test a common language such as English and a less common language. Verify unsupported pairs produce the dedicated message and do not overwrite the previously active language.
- Verify repeated language changes reuse client/server caches and do not repeatedly consume provider quota.
- Verify recipe/profile names and user-entered content are not sent to the translation provider.
- Verify AI Telemetry, AI Analysis, AI Tips, timer, App Tour, Android Back/PiP, recipes, and synchronization still behave as before.
