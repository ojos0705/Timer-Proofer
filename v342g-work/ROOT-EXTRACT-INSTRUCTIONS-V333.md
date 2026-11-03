# Timer Proofer V333 — Root Extract Instructions

1. Back up `C:\xampp\htdocs\proofing-donat-baru` and preserve any uncommitted work.
2. Extract the ZIP contents directly into `C:\xampp\htdocs\proofing-donat-baru` (root, not a nested V333 folder).
3. Do not delete/overwrite `.git`, `.env`, `.env.local`, `android/local.properties`, or local secrets.
4. In PowerShell:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm ci
npm test
git diff --check
git status --short
```

5. Review changed files and ensure API keys/passwords/tokens are not staged.
6. Commit and push to the active Vercel Preview branch:

```powershell
git add -A
git diff --cached --check
git status
# Inspect staged files before committing.
git commit -m "V333: Fix onboarding pages, auth viewport and translation diagnostics"
git push origin fix/v318-vercel-output-directory
```

If your active Preview branch differs, use that branch instead. Wait for the deployment to finish before testing web/API routes.

## Build and install Android Debug APK

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm run sync:android
cd android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug
```

APK path:
`android\app\build\outputs\apk\debug\app-debug.apk`

## Live Cloud Translation (optional; requires paid-service billing setup)

Cloud Translation requires an enabled Google Cloud project, the Cloud Translation API, and Billing. The Basic NMT pricing currently includes the first 500,000 characters/month through up to USD 10 in monthly credit, then USD 20 per million characters. Add a restricted server-side API key to Vercel as `GOOGLE_CLOUD_TRANSLATE_API_KEY` for Preview and Production, then redeploy. Never put this key in source files, APK, or Git.

Read `ONBOARDING-LOGIN-AND-TRANSLATION-ROBUSTNESS-V333.md` for detailed manual tests and diagnostic meanings.
