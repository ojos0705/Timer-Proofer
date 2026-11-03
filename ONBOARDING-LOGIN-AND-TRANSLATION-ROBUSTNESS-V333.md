# Onboarding, Login Layout, and Translation Diagnostics — V333

## Scope
V333 is a focused UI/runtime robustness release based on the user-supplied V332 source. It retains the existing DOM IDs, classes, event contracts, login/auth behavior, offline translation packs, and server-side Cloud Translation proxy.

## 1. Pre-login onboarding slider

The previous slider used a 300%-wide track and transformed it by a percentage of that track. That geometry can expose a portion of the adjacent slide on some WebView/layout combinations.

Changes:
- The track now occupies exactly 100% of the slider viewport.
- Each slide is a non-shrinking `flex: 0 0 100%` page.
- `OnboardingManager.updateSliderPosition()` measures the actual wrapper width and applies a pixel-based `translate3d` offset.
- Window and `visualViewport` resize events realign the active slide after orientation or WebView viewport changes.
- Illustration, heading, description, and spacing shrink on short screens; safe-area insets are respected.
- Existing pointer/touch swipe and button/dot controls remain intact.

## 2. Login/register viewport

The former `.auth-container { min-height: 100vh }` and `.inputs-wrapper { min-height: 240px }` forced unnecessary vertical space around the login/register card.

Changes:
- The auth card now sizes to content with `min-height: 0`.
- The artificial 240px input spacer is removed only while logged out.
- The card is centered within the available WebView viewport and uses safe-area-aware padding.
- On a short viewport, the card itself scrolls vertically rather than extending beyond the screen.
- Login, register, forgot-password, and OTP markup and action IDs remain unchanged.

## 3. Translation error diagnostics

The Cloud Translation API proxy remains server-side. No provider secret is added to HTML, JavaScript, Capacitor assets, source control, or this ZIP.

The shared API client now attaches stable error codes for:
- `API_ROUTE_NOT_FOUND`: API route missing from the active deployment (including HTTP 404).
- `API_INVALID_RESPONSE`: route returned non-JSON or malformed JSON.
- `API_NETWORK_ERROR`: fetch failed before an HTTP response (common for DNS/TLS/CORS/connectivity failures).
- Provider responses keep their original sanitized API error code, such as `TRANSLATION_NOT_CONFIGURED`, `TRANSLATION_PROVIDER_NOT_READY`, `TRANSLATION_AUTH_INVALID`, `TRANSLATION_QUOTA_EXCEEDED`, or `TRANSLATION_RATE_LIMITED`.

The language picker now tells the user which class of failure occurred, and logs only a bounded URL plus code/status (never the access token or provider key).

### Meaning of the current error before setup
If `GOOGLE_CLOUD_TRANSLATE_API_KEY` is absent from Vercel, the V332/V333 API handler intentionally returns `TRANSLATION_NOT_CONFIGURED`. The client will now show a direct setup message instead of the generic fallback. If it reports `API_ROUTE_NOT_FOUND` or `API_NETWORK_ERROR`, deploy/CORS/network routing must be checked separately.

## 4. Cloud Translation billing notes (checked 2026-11-01)

Cloud Translation Basic (v2), Neural Machine Translation (NMT):
- First 500,000 characters/month: free via monthly credit of up to USD 10.
- Above 500,000 characters: USD 20 per 1,000,000 characters.
- Billing must still be enabled on the Google Cloud project to use Cloud Translation.
- Whitespace and all characters sent for translation are counted.

Official sources:
- https://cloud.google.com/products/translate/pricing
- https://docs.cloud.google.com/translate/docs/setup

Set a quota and budget alert before enabling live service. The application does not enable Billing or create Google credentials automatically.

## 5. Deployment sequence

1. Extract the ZIP into the repository root after making a backup. Keep `.git`, `.env`, `.env.local`, and `android/local.properties`.
2. Run `npm ci`, `npm test`, and `git diff --check`.
3. Inspect `git status --short` and staged diff. Do not stage secret files.
4. Commit/push V333 to the Vercel Preview branch. Vercel deploys the API functions from root `api/` along with static output in `www/`.
5. For live online translation only, create/enable the Google Cloud project, enable Cloud Translation API and Billing, create a server key restricted to Cloud Translation API, then add `GOOGLE_CLOUD_TRANSLATE_API_KEY` to Vercel Preview and Production Environment Variables.
6. Redeploy the environment after adding the variable. Native Capacitor requests use `https://timer-proofer.vercel.app`, so the production API must be deployed before expecting the APK to translate online.
7. Rebuild/install Android with `npm run sync:android`, then `:app:assembleDebug` and `:app:installDebug`.

## 6. Manual device checks still required

### Onboarding
- Preview with `?tp-onboarding-preview=1&reset=1`.
- Verify exactly one full slide is visible at each of slides 1, 2 and 3; no portion of the neighboring slide should appear.
- Swipe left/right, tap dots, and use Next on narrow and short devices.
- Rotate the device or resize the viewport while the onboarding screen is open; current slide should remain aligned.

### Login/register
- Verify login and register cards no longer have large empty bands above/below.
- Test short-screen scrolling and the Android keyboard.
- Verify forgotten-password and OTP views remain scrollable and the existing auth actions work.

### Online language
- Before credentials are configured, verify the picker reports `TRANSLATION_NOT_CONFIGURED` explicitly (provided the V333 API routes have been deployed).
- After configuration/redeployment, select several supported languages, including Abkhaz only if it appears in the live provider catalog.
- Test online/offline transitions, login expiry, and quota errors. The previous language should remain active on failure.

## Verification performed
- `npm test`: 493 passed, 0 failed, 0 skipped.
- Release verifier: 76 precache paths valid; 69 local modules in boot graph; 0 missing imports; 0 duplicate HTML IDs; 0 inline event handlers; 0 scroll-lock overrides outside the canonical owner.
- Function-name audit: 0 duplicate function declarations within any single module. Cross-module same-name helpers are informational and are not duplicate declarations in one module.
- ZIP integrity and clean-extraction test are recorded in `QA-TEST-LOG-V333.txt`.

## Not claimed as verified
- Live Google Cloud Translation, because no production key/Billing credentials are present in this environment.
- Vercel Preview/Production deployment.
- Physical Android/iOS behavior for V333 or the Gradle APK build.
