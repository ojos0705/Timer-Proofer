# Timer-Proofer ES6 Modular V308 — Page Modal Layout Fix

## Diagnosis
The supplied `#settings-modal` uses a column flex layout with a long `.modal-scroll-content`. A flex child can retain its automatic minimum height unless `min-height: 0` is set, so the scroll area may not shrink to the available viewport height and can push later content/actions below the visible area. The existing CSS also did not explicitly reserve a non-shrinking layout role for the modal header/footer.

## Changes
- Added `min-height: 0` and `min-width: 0` to `.modal-scroll-content`, with vertical scrolling and horizontal overflow clipping.
- Kept the modal header and `.modal-bottom-actions` as non-shrinking flex children.
- Kept the page modal bounded to the dynamic viewport and included the bottom safe-area inset.
- Raised the default `.page-modal` stacking level to `11000`, consistent with the supplied active modal inline z-index, so a fixed bottom navigation layer cannot cover the modal's bottom controls.
- Bumped runtime asset version to `20261027-v309` and Service Worker cache to `Timer-Proofing-v1.1.214` to prevent stale CSS/HTML from being reused.
- Preserved existing IDs, data-action attributes, menu content, and handlers.

## Verification
- `npm test`: **398 passed, 0 failed**.
- Release checks: 74 precache paths checked, no missing local assets, 0 missing imports, 0 duplicate HTML IDs, 0 inline handlers, 0 scroll-lock overrides.
- This is static and automated verification; visual testing in an actual browser and installed Android/iOS app is still required.
