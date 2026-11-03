# Timer Proofer V322 — Recipe UI, AI Tips Formatting, and Premium Print Fix

## Changes

1. **AI Tips formatting**: introduced `formatTipsHasilAI()` as a separate formatter. It separates joined numbered steps, keeps headings and paragraphs readable, and escapes model-provided HTML. The existing `formatHasilAI()` remains unchanged for AI Analysis.
2. **Recipe detail close**: `tutupHalamanResepSecaraAman()` now returns from `recipe-detail-view` to `recipe-master-view`; closing the recipe modal remains possible from the master view. Existing element IDs are preserved.
3. **Location header shrink**: the shrink observer now checks the nested scroll area, app container, document scroll and window scroll, and updates the `shrunk` class when scrolling.
4. **Location colors**: `loc-line1` and `loc-line2` use stable chocolate/brown brand colors instead of inheriting the weather accent.
5. **Premium PDF**: the report template is no longer positioned at `top:-9999px`. It is attached within the viewport for capture, uses a progress overlay, waits for layout frames, sets a capture height, validates the PDF result, escapes inserted values, and cleans up temporary DOM/overlay state.
6. **PWA cache**: technical release token moved to `20261030-v323`; Service Worker cache moved to `Timer-Proofing-v1.1.225`. User-facing product version remains **V125**.

## Scope protection

- AI Telemetry behavior is unchanged.
- AI Analysis formatter and behavior are unchanged.
- AI Tips uses a dedicated formatter only.
- Existing DOM IDs and established page structure are preserved.

## Verification

- 18 focused tests passed for AI Tips formatting, PDF renderer behavior, recipe navigation, location shrink/colors, and release metadata.
- 410 regression tests across 87 test files passed (the external-SDK `ai-utils.test.mjs` was excluded because the Gemini SDK dependency could not be installed in this build environment).
- `verify-release.mjs`: passed; 74 precache paths, 67 ESM modules in entrypoint graph, 245 JS files, 2 HTML files, 300 IDs, zero missing imports, zero duplicate IDs, zero inline handlers, zero scroll-lock overrides.
- `audit-function-names.mjs`: zero duplicate function declarations within a single module.
- `node --check` passed for `assets/js/app-core.js` and `assets/js/ai-formatters.js`.

## Manual verification still required

Test in a real browser and installed PWA / Capacitor build:
- close detail view returns to recipe master view;
- scroll timer page and observe location header shrink;
- location text remains chocolate/brown;
- generate Premium PDF and confirm non-empty pages, images, ingredients, analysis and production steps;
- test AI Tips with short and multiline answers.

The PDF renderer was covered by unit/static tests but not live browser/device rendering in this environment.
