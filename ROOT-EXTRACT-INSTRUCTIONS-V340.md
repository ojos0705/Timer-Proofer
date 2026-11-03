# Root Extract Instructions — Timer Proofer V340

1. Back up `C:\xampp\htdocs\proofing-donat-baru` and save/commit any local changes first.
2. Extract the ZIP contents directly into `C:\xampp\htdocs\proofing-donat-baru` (not into a nested V340 folder).
3. Do not overwrite/remove `.git`, `.env`, `.env.local`, `android/local.properties`, API keys, tokens, or other local secrets.
4. From PowerShell run:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm ci
npm test
git diff --check
git status --short
```

5. Review the diff. Confirm only intended files changed and no secrets are staged.
6. Build and install the Android debug APK:

```powershell
npm run sync:android
cd android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug
```

7. Test TOS from Settings and Register, and compare all 11 Settings labels on PWA and Android. Use `MANUAL-DEVICE-TEST-PLAN-V340.md`.
8. Push to the Preview branch, test Preview, then merge to `main` for Production only after the manual checks pass.

Product-facing version remains V125. V340 is the technical release with token `20261101-v340` and Service Worker cache `Timer-Proofing-v1.1.242`.
