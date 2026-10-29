# Implementation Plan - Migrate to AndroidX

The project is experiencing build errors because the `:capacitor-cordova-android-plugins` module contains legacy `android.support` imports and dependencies, while the project is configured to use AndroidX.

## Proposed Changes

### Build Configuration

#### [MODIFY] [libs.versions.toml](file:///C:/xampp/htdocs/proofing-donat-baru/android/gradle/libs.versions.toml)
- Remove `support-v4` version and library.
- Add `androidx-print` and `androidx-annotation` if needed, or ensure they are available through other dependencies.

#### [MODIFY] [build.gradle](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/build.gradle)
- Replace `com.android.support:support-v4:28.+` with AndroidX equivalents:
    - `androidx.print:print:1.0.0`
    - `androidx.annotation:annotation:1.7.0` (or similar)

### Source Code Migration

Migrate all `android.support` imports to `androidx` in the following files:

#### [MODIFY] [PrintAdapter.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/PrintAdapter.java)
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.v4.print.PrintHelper` -> `androidx.print.PrintHelper`

#### [MODIFY] [PrintContent.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/PrintContent.java)
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.annotation.Nullable` -> `androidx.annotation.Nullable`

#### [MODIFY] [Printer.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/Printer.java)
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.annotation.Nullable` -> `androidx.annotation.Nullable`

#### [MODIFY] [PrintIO.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/PrintIO.java)
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.annotation.Nullable` -> `androidx.annotation.Nullable`

#### [MODIFY] [PrintManager.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/PrintManager.java)
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.annotation.Nullable` -> `androidx.annotation.Nullable`
- `android.support.v4.print.PrintHelper` -> `androidx.print.PrintHelper`

#### [MODIFY] [PrintOptions.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/PrintOptions.java)
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.v4.print.PrintHelper` -> `androidx.print.PrintHelper`
- Static imports for `PrintHelper` constants.

#### [MODIFY] [PrintProxy.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/PrintProxy.java)
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.v4.print.PrintHelper` -> `androidx.print.PrintHelper`

## Verification Plan

### Automated Tests
- Run `./gradlew :capacitor-cordova-android-plugins:compileDebugJavaWithJavac` to ensure the module compiles.
- Run a full build: `./gradlew assembleDebug`.
