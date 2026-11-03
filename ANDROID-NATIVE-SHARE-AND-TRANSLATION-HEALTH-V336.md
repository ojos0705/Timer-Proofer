# V336 — Android native Share + translation endpoint diagnostics

## Root cause: Android share sheet

V335 already called the `Share.share()` proxy exposed by the vendored Capacitor bridge, but `@capacitor/share` was absent from `package.json` and `package-lock.json`. The generated Android plugin registry and Gradle project list also had no native Share implementation. Browser/PWA sharing worked because it used `navigator.share`; Capacitor Android could not resolve the native plugin and fell into the error path.

V336 adds `@capacitor/share` 8.0.2, compatible with the existing Capacitor 8 core (`peerDependencies @capacitor/core >=8.0.0`), and aligns the lockfile, Android Gradle include/dependency, and generated plugin registry. The existing branded in-app share modal, URL, and action IDs remain unchanged. The plugin is official and should be re-synchronized on the developer machine using `npx cap sync android` (the project's `npm run sync:android` also runs this).

## Translation endpoint GET diagnostics

`GET /api/translate` now returns a small, unauthenticated health/route descriptor (`endpoint: reachable`, `translationMethod: POST`, `authenticationRequired: true`, `provider: MyMemory`). It does not invoke MyMemory, expose credentials, or prove provider quota/availability. Actual translation continues to require authenticated `POST` JSON.

Opening the API URL in the browser address bar sends GET. Previously it returned `405 METHOD_NOT_ALLOWED` because translation is POST-only. That response did not mean Vercel could not reach the route; it meant the requested HTTP method was not allowed. The GET health response removes that ambiguity.

## MyMemory quota

The 5,000-character/day message is generated only after the request reaches MyMemory and the provider reports quota exhaustion. The documented anonymous limit is 5,000 characters/day; adding a valid contact email through MyMemory's `de` parameter increases the limit to 50,000 characters/day. V335 already reads `MYMEMORY_CONTACT_EMAIL` server-side and sends it as `de`; V336 preserves that behavior.

To enable the larger allowance, add this Vercel Environment Variable for Preview and Production:

- `MYMEMORY_CONTACT_EMAIL` = a valid contact email address you control.

Redeploy Production after saving the variable. Do not put this value in browser JavaScript or the APK. MyMemory's daily quota remains a provider limit; the client-side cache reduces repeat requests but does not increase the provider quota.

## Verification

- `npm test`
- `git diff --check`
- `npm run sync:android`
- `cd android && .\\gradlew.bat :app:assembleDebug`
- Install on Android and test the native share chooser from the existing “Bagikan melalui aplikasi” action.
- Open `/api/translate` in a browser: expect HTTP 200 endpoint health JSON.
- Choose a language while logged in: this triggers authenticated POST and consumes MyMemory character quota for uncached strings.

Automated tests do not replace the native share chooser/device test or a live request against Vercel/MyMemory.
