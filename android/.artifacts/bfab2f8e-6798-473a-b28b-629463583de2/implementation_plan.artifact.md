# Fix legacy Android Support Library imports

The project is configured to use AndroidX, but the `:capacitor-cordova-android-plugins` module contains legacy `android.support` imports and dependencies. This causes build errors like `package android.support.annotation does not exist`.

## Proposed Changes

### [capacitor-cordova-android-plugins](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins)

#### [MODIFY] [build.gradle](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/build.gradle)
Update the legacy `support-v4` dependency to the AndroidX legacy support library.

#### [MODIFY] [PrintAdapter.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/PrintAdapter.java)
Update imports:
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.v4.print.PrintHelper` -> `androidx.print.PrintHelper`

#### [MODIFY] [PrintIO.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/PrintIO.java)
Update imports:
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.annotation.Nullable` -> `androidx.annotation.Nullable`

#### [MODIFY] [Printer.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/Printer.java)
Update imports:
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.annotation.Nullable` -> `androidx.annotation.Nullable`

#### [MODIFY] [PrintManager.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/PrintManager.java)
Update imports:
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.annotation.Nullable` -> `androidx.annotation.Nullable`
- `android.support.v4.print.PrintHelper` -> `androidx.print.PrintHelper`

#### [MODIFY] [PrintContent.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/PrintContent.java)
Update imports:
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.annotation.Nullable` -> `androidx.annotation.Nullable`

#### [MODIFY] [PrintOptions.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/PrintOptions.java)
Update imports:
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.v4.print.PrintHelper` -> `androidx.print.PrintHelper`
Update static imports for `PrintHelper` constants.

#### [MODIFY] [PrintProxy.java](file:///C:/xampp/htdocs/proofing-donat-baru/android/capacitor-cordova-android-plugins/src/main/java/de/appplant/cordova/plugin/printer/PrintProxy.java)
Update imports:
- `android.support.annotation.NonNull` -> `androidx.annotation.NonNull`
- `android.support.v4.print.PrintHelper` -> `androidx.print.PrintHelper`

## Verification Plan

### Automated Tests
- Run `./gradlew :capacitor-cordova-android-plugins:compileDebugJavaWithJavac` to ensure the module compiles correctly.

### Manual Verification
- None required as this is a build-time fix.
