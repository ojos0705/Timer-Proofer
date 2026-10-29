# AI Analysis Dynamic Data and Resilience — V315

## Changes
- AI telemetry reads live temperature and relative humidity from existing sensor/status elements; it no longer silently substitutes fixed values when readings are missing.
- Requests include the current temperature, humidity, selected product, and visible timer information in the prompt context.
- The telemetry system instruction requests a contextual proofing-time range, visual readiness cues, risks, and explicit uncertainty when recipe/yeast/dough-temperature data is unavailable.
- Frontend catches for telemetry, deep analysis, and AI tips now emit structured `console.error` diagnostics (name/message/status/code/URL where available) while preserving user-facing error UI.
- Backend AI model fallback now tries the next configured model when a provider reports temporary high demand/overload/service unavailability. If all candidates are unavailable, the endpoint returns a clear 503 response instead of misreporting the issue as exhausted quota.
- Service Worker cache bumped to `Timer-Proofing-v1.1.219`; technical release token is `20261027-v316`. Product-facing version remains `V125`.

## Verification
- `npm test`: 407 passed, 0 failed.
- `scripts/verify-release.mjs`: passed; 74 precache entries, 67 local modules, 236 JavaScript files inspected, 2 HTML files inspected, 300 IDs, no missing imports or duplicate IDs.
- Syntax checks passed for `assets/js/app-core.js`, `api/ai-utils.js`, and `api/ai-telemetry.js`.
- Real deployment/provider calls and browser/device UI tests still need to be performed after deployment.
