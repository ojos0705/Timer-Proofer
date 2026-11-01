# Android App Icon and Cross-platform Share UI — V335

## App icon

- `logo-donat.svg` remains the canonical brand artwork: cream background `#FDF5E6`, orange donut `#E67E22`, cream center hole, and brown outer stroke `#4E342E`.
- PWA manifest now uses the generated 192px, 512px, and maskable 512px PNG variants under `assets/icons/`.
- Android launcher artwork is synchronized across mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi resources, including round and adaptive-icon foreground/background resources.
- Android splash PNGs use the same brand motif and palette. Their original density/orientation dimensions are preserved.
- Android launchers may crop the icon to a circle/squircle mask; that is OS mask behavior, not a different brand asset.

## Share UI

- The existing `Bagikan ke Teman` settings entry opens `#share-app-modal` on both PWA and Capacitor.
- The branded in-app card is shared; the actual share chooser remains provided by Web Share API in browser or Capacitor Share on native.
- Copy-link fallback is available when a share chooser is unavailable or dismissed.
- No platform-specific chooser UI is claimed to be visually identical; only the in-app panel is common.
