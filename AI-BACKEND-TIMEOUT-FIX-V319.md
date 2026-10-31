# AI Backend Timeout Fix — V319

## Root cause confirmed from Vercel logs

The V318 Preview deployment returned HTTP 400 from the Gemini SDK with `INVALID_ARGUMENT`: `Manually set deadline 6s is too short. Minimum allowed deadline is 10s.` This was the direct cause of the generic HTTP 500 shown by `/api/ai-telemetry` and `/api/ai-tips`.

## Changes in V319

- Provider SDK and per-call hard deadline increased from 6 seconds to 11 seconds, safely above Gemini's 10-second minimum.
- Added a 26-second total budget for provider attempts/fallbacks, below the frontend's 30-second request timeout. The backend stops starting additional attempts unless a full valid 11-second provider window remains.
- Synced `api/ai-utils.js` and `www/public/api/ai-utils.js` to identical source.
- Updated the revision header and server log marker to `V319`. Product-facing app version remains V125.
- Added regression assertions for the provider minimum and total timeout budget.

## Deployment and verification

1. Copy these V319 changes to the repository branch used for deployment and push/merge into the intended Vercel environment.
2. Trigger one AI Tips request and one AI Telemetry request on the resulting Preview deployment.
3. Confirm responses include `X-AI-Backend-Revision: V319`.
4. Confirm the previous `Manually set deadline 6s is too short` message no longer appears. If an error remains, capture the new provider status/code/message; it should be a different underlying error.

Local tests cannot verify Google's live service or the user's Vercel environment.
