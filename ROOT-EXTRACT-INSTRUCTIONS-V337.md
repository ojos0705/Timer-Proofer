# Timer Proofer V337 — Root Extract Instructions

1. Back up `C:\xampp\htdocs\proofing-donat-baru` or commit any local changes first.
2. Extract the ZIP contents directly into `C:\xampp\htdocs\proofing-donat-baru`; do not create a nested V337 folder.
3. Do not overwrite `.git`, `.env`, `.env.local`, or `android/local.properties`.
4. In PowerShell:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm ci
npm test
git diff --check
```

5. Review `git status --short` and the complete diff. Confirm no credentials, keys, tokens, or local private configuration files will be committed.
6. Push to your Preview branch, validate the Preview deployment, and merge to `main` only after the Preview checks pass.
7. Rebuild and install the Android APK:

```powershell
npm run sync:android
cd android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug
```

## V337 share behavior
- `Bagikan melalui aplikasi`: shares title, invitation text, and application URL.
- `Bagikan tautan saja`: shares a URL-only payload through Capacitor Share on Android and Web Share API on PWA.
- `Salin tautan`: retains the clipboard/manual-copy fallback.

The receiving Android application controls its own link preview/rendering. Test with installed targets on a physical device after installation.

Product-facing version remains V125. V337 is the technical/cache revision.
