# Timer Proofer V336 — Root Extract / Android Share + Translation Endpoint Health

## 1. Backup and extraction

1. Back up `C:\xampp\htdocs\proofing-donat-baru` or commit/stash local changes.
2. Extract the contents of this ZIP directly into `C:\xampp\htdocs\proofing-donat-baru` (repository root), not into a nested V336 folder.
3. Do not overwrite or remove `.git`, `.env`, `.env.local`, `android/local.properties`, signing credentials, or local secrets.

## 2. Install dependencies and verify source

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm ci
npm test
git diff --check
git status --short
```

`@capacitor/share` 8.0.2 is now an explicit dependency and is recorded in `package-lock.json`. `npm ci` installs the native implementation. Do not skip it when testing Android native share.

## 3. Synchronize Capacitor Android

```powershell
npm run sync:android
```

This runs the web asset sync and `cap sync android`. Confirm these generated files contain `capacitor-share` / `@capacitor/share`:

- `android/capacitor.settings.gradle`
- `android/app/capacitor.build.gradle`
- `android/app/src/main/assets/capacitor.plugins.json`

Then build and install:

```powershell
cd android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug
```

For iOS, run `npx cap sync ios` after `npm ci` before building in Xcode.

## 4. Translation endpoint deployment and free quota

V336 adds a safe GET health response. After the API is deployed, opening `https://timer-proofer.vercel.app/api/translate` in a browser should return HTTP 200 JSON that identifies the endpoint as reachable and states that translation itself requires authenticated POST. This GET does not test MyMemory or consume translation characters.

Actual language translation continues to use authenticated `POST /api/translate` from the logged-in app. MyMemory's documented anonymous limit is 5,000 characters/day. A valid contact email supplied as the `de` parameter raises the allowance to 50,000 characters/day.

To use the larger free allowance, add the following server-side Vercel Environment Variable for both Preview and Production:

- Name: `MYMEMORY_CONTACT_EMAIL`
- Value: a valid contact email address you control

Save the variable and redeploy. The value is read by `api/translate.js` on Vercel only; it is not included in frontend JavaScript or the APK. The provider's 50,000-character daily quota still applies. The browser's per-language local cache reduces repeated requests but does not remove the provider's quota.

## 5. Test plan

- Open `/api/translate` in a browser: expect `200` health JSON, not `405`.
- Log in to the app and choose an online language: verify the app issues authenticated POST and the UI translates.
- Verify a provider quota response remains visible and cached strings still render.
- On Android, open Settings > Bagikan ke Teman > Bagikan melalui aplikasi. Confirm the Android system share chooser appears and offers installed target apps.
- On PWA, confirm the existing branded modal and browser Web Share continue working.
- Confirm the Copy Link fallback still works in both environments.

Automated tests do not replace live Vercel/MyMemory calls or an Android physical-device share-sheet check. The user must build and install the new APK after syncing.

## 6. Git Preview workflow

Review `git status --short` and staged files. Do not commit `.env`, API keys, passwords, tokens, keystores, or signing credentials. Push the tested source to the Preview branch, verify Vercel Preview, then merge the approved pull request to `main` for Production.
