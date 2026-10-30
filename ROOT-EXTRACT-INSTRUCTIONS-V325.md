# Timer Proofer V325 — Root Extract & GitHub Instructions

## Scope
V325 restores timer control bindings, custom timer duration and start behavior; adds the Android Capacitor native PiP bridge; fixes donut instruction lookup; overlays the recipe guide over the timer circle; and makes the main app content a single vertical scroll region.

Product-facing version remains **V125**. Technical cache is `Timer-Proofing-v1.1.227`.

## Extract
1. Back up `C:\xampp\htdocs\proofing-donat-baru`.
2. Extract this ZIP directly into `C:\xampp\htdocs\proofing-donat-baru` (repository root).
3. Do not delete or replace `.git`, `.env`, `.env.local`, or `android/local.properties`.
4. Allow updated project files to overwrite older files. Keep local secrets and machine-specific SDK paths untouched.

## Test and push Preview
Open PowerShell in the repository root:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm test
git diff --check
git status --short
```

Review all changed files. Ensure no `.env`, API key, credentials, passwords, signing keys, or machine-specific `android/local.properties` are staged.

```powershell
git add -A
git diff --cached --check
git status
```

If the staged list is correct:

```powershell
git commit -m "V325: Restore proofing timer and add Android PiP"
git push origin fix/v318-vercel-output-directory
```

The push creates a Vercel Preview because it is a feature branch. Test Preview before merging the pull request into `main` for Production.

## Build Android / enable PiP
Run from repository root (requires dependencies installed):

```powershell
npm run sync:android
```

Then build with the Windows Gradle wrapper:

```powershell
cd android
.\gradlew.bat :app:assembleDebug
```

Or open Android Studio, sync Gradle, then build/install the debug APK. Do not commit `android/local.properties`.

The `TimerPipPlugin.java` and `MainActivity.java` sources are part of the ZIP. `AndroidManifest.xml` enables `supportsPictureInPicture` and `resizeableActivity` for MainActivity.

## Device requirements and behavior
- Native system PiP requires Android 8.0 / API 26 or newer and device support for PiP.
- Allow Picture-in-picture for Timer Proofer in Android Settings > Apps > Timer Proofer > Picture-in-picture (menu wording may differ by device).
- Set a custom duration or choose a proofing mode, then tap Start Proofing.
- With the countdown running and no modal or recipe/tips overlay active, press the physical Back button. The native Capacitor bridge requests Android PiP.
- If an overlay/modal is open, Back closes it first; a subsequent Back while the timer is still active enters PiP.
- Returning from PiP restores the normal app UI through Android onPictureInPictureModeChanged callback (not only appState); timer uses persisted absolute deadline to remain accurate.

Native system PiP is implemented for the Capacitor Android application. A normal browser/PWA build does not load the native Android plugin, and this package does not implement iOS PiP.

## Important validation limitation
Automated tests and static release checks pass. The Android Gradle compile and physical-device PiP test must still be completed on the user's Windows/Android development machine because the build container cannot access the configured Windows SDK and Gradle distribution endpoint.
