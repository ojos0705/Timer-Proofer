# V337 — Separate Share Link action

## Issue
The native Android share chooser opened successfully in V336, but users did not see a distinct URL-only share action comparable to the browser/PWA share-link behavior.

## Change
- Preserve the existing invitation share (`title + text + URL`).
- Add a separate **Bagikan tautan saja** action in the same branded share panel for both PWA and Capacitor.
- On Capacitor, invoke the official `@capacitor/share` plugin with `title` and `url` only (no `text`).
- On PWA, invoke `navigator.share({ title, url })`.
- If the platform share API is unavailable, fall back to the existing copy-link function.
- Share cancellation is treated as a normal user dismissal and does not show an error.
- Keep the existing copy-link action.

The official Capacitor Share Android implementation maps a URL-only payload to `Intent.EXTRA_TEXT` containing the URL. The receiving application remains responsible for rendering it as a clickable link/preview. Android's Sharesheet visuals and app targets can vary by Android version and installed applications.

## Verification
- Static regression tests assert the distinct UI action and URL-only payload for native and PWA paths.
- Full release tests and a clean extraction test are recorded in `QA-TEST-LOG-V337.txt`.
- A physical Android share-target test is still required to verify how WhatsApp, Gmail, and other installed apps render the URL on the user's device.
