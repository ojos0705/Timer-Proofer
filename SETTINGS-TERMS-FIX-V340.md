# V340 — Settings Typography and Terms & Conditions Navigation

## Scope
This maintenance release addresses two reported defects from V339:
1. The `Tour Aplikasi` row looked larger than the other Settings entries.
2. The `Syarat & Ketentuan Layanan` entry did not open its content.

The Welcome Screen, Login/Register layout, App Tour content, language provider, sharing behavior, timer, AI features, and existing Settings destinations remain unchanged.

## 1. Settings typography
- All 11 Settings action rows now declare the same title typography: `1rem`, weight `600`, line-height `1.2`.
- All 11 descriptions now declare `0.618rem`, weight `400`, line-height `1.35`, with a consistent top gap.
- This makes the relationship `1 / 0.618 ≈ 1.618` (Golden Ratio) explicit in the rendered markup as well as in the shared CSS variables.
- Icon scale, arrow scale, row padding, tap area, IDs, and data-action targets are preserved.

## 2. Terms & Conditions navigation
- The Register consent link and Settings row use a dedicated `openTermsModal` action.
- The action always opens the existing `#tos-modal` using the canonical modal controller; a repeated tap while the modal is open does not accidentally close it.
- The TOS modal is detached from `#app-container > .scrollable-content` to `document.body` during modal bootstrap. The existing node, ID, content, and delegated event bindings are preserved. This avoids positioning/clipping problems for a fixed modal inside the scrollable app shell in browser and Capacitor WebViews.
- Closing the TOS modal continues to use the canonical modal lifecycle and restores Settings when it was opened as a Settings child.

## Verification
- Focused tests cover the 11-row typography contract, both TOS entry points, idempotent opening, and TOS modal detachment.
- Full `npm test`: 523 passed, 0 failed.
- Release verifier: 80 precache paths valid, 69 local modules in the boot graph, 279 JavaScript files checked, 2 HTML files, 306 IDs, 0 duplicate IDs, 0 missing local imports, 0 inline event handlers, and 0 scroll-lock overrides outside the canonical owner.
- Function-name audit: 0 duplicate function declarations within a module. Cross-module name matches are informational and are not counted as same-module redeclarations.

## Manual verification still required
Open Settings in the installed PWA and Android APK, compare the Tour row with adjacent rows, open Terms & Conditions from Settings, close it and confirm Settings is restored, then open Terms & Conditions from Register. Device-level visual and touch testing is not performed by the automated suite.

## Release metadata
- Product-facing version: V125 (unchanged)
- Technical release: V340
- Release token: `20261101-v340`
- Service Worker cache: `Timer-Proofing-v1.1.242`
