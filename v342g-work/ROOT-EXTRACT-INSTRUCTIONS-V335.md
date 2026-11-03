# Timer Proofer — V335 Root Extract Instructions

## Scope

V335 is a technical revision. The user-facing product version remains **V125**.

This package includes:
- PWA and Android launcher/adaptive/splash artwork derived from the same `logo-donat.svg` donut mark and brand palette.
- A Terms & Conditions link routed through the existing modal system.
- Registration consent enforced in the UI and again at submit time; the Register button stays disabled until the checkbox is checked.
- A branded `Bagikan ke Teman` modal shared by PWA and Capacitor. The final system share sheet remains platform-native by design.
- CapacitorHttp for translation calls from native Android/iOS; PWA continues to use browser `fetch`.
- Version/cache revision V335.

## 1. Backup and extraction

1. Back up `C:\xampp\htdocs\proofing-donat-baru` or commit/stash local changes first.
2. Extract the ZIP contents directly into `C:\xampp\htdocs\proofing-donat-baru`; do not create a nested V335 directory.
3. Preserve local-only files. Do not overwrite or delete `.git`, `.env`, `.env.local`, `android/local.properties`, signing keys, or machine-specific SDK paths.
4. Review `git status --short` and the source diff before staging.

## 2. Source verification

Run in PowerShell:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm ci
npm test
git diff --check
git status --short
```

`npm test` runs web-asset synchronization, release validation, duplicate-function audit, and the Node test suite.

Before committing, inspect staged files and ensure no credentials, signing keys, `.env` files, or local machine configuration are included.

## 3. Deploy web/API before native APK

Push the reviewed source to the Preview branch first. Verify the Preview deployment, then merge/deploy to Production when ready.

The translation route is `api/translate.js`. The APK requests the Production endpoint `https://timer-proofer.vercel.app/api/translate`. Therefore, publish the V335 API route to Production before testing the native translation call in the updated APK.

The free MyMemory provider does not require Google Cloud Billing or a provider API key. Optional Vercel environment variable:

- `MYMEMORY_CONTACT_EMAIL`: valid developer contact email; MyMemory documents a higher daily character allowance when a contact email is provided. It is not a secret/API key. Omit it to use the lower anonymous allowance.

Set it in Preview/Production only if appropriate, then redeploy. Provider quotas and language-pair availability remain outside the app's control.

## 4. Synchronize and install Android

After dependencies are installed and source verification passes:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm run sync:android

cd android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug
```

Connect the Android device with USB debugging enabled and accept the debugging authorization prompt. `installDebug` requires the Android SDK and Gradle environment configured on the development machine.

CapacitorHttp is bundled with `@capacitor/core`; V335 uses its direct native `request()` method for translation only. It does not globally patch all `fetch`/`XMLHttpRequest` calls, to avoid changing unrelated network behavior. PWA continues through normal browser fetch and still relies on the Vercel CORS headers.

## 5. Manual acceptance tests

### Branding
- Compare installed Android launcher icon with the PWA logo.
- Confirm adaptive icon remains centered under circular/squircle launcher masks.
- Confirm Android splash screen uses the same cream/orange/brown donut branding.

### Registration and Terms
- Open Register tab: `DAFTAR SEKARANG` must be disabled while consent is unchecked.
- Tap `Syarat & Ketentuan Layanan`: the existing TOS/privacy modal must open.
- Close the modal; checkbox state must be preserved.
- Check consent: button enables. Uncheck it: button disables again.
- Attempt submit while unchecked (including keyboard submit): registration must be rejected.
- Login mode must remain usable without registration consent.

### Share
- Open `Bagikan ke Teman` on PWA and APK: the in-app branded modal and contents should match.
- Tap native/browser share: the operating system/browser share chooser may look different by platform.
- Test copy-link fallback.

### Translation
- Login, select a target language, and verify `/api/translate` receives the request.
- On native Android/iOS, verify CapacitorHttp is available and the request does not fail at WebView CORS preflight.
- On PWA, verify browser fetch and Vercel CORS still work.
- Check cache reuse, unsupported language pair, quota response, no network, and expired login cases.

## Limitations

Automated tests and static release checks do not replace a Gradle build, a real Android/iOS device test, a live Production Vercel request, or a real MyMemory provider response. These must be verified after deployment on the user's environment.
