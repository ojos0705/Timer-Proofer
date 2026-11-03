# Manual Device Test Plan — V340

## Settings typography
1. Open Pengaturan on desktop PWA, mobile PWA, and installed Android APK.
2. Compare the title `Tour Aplikasi` with `Koneksi Sensor`, `Preferensi Aplikasi`, `Pusat Bantuan & Panduan`, and other Settings titles.
3. Confirm all titles have the same size/weight and all descriptions have the same smaller scale.
4. Check a translated language with longer strings and Android system font scaling.
5. Tap each row and confirm its original destination still opens.

## Terms & Conditions
1. From Settings, tap `Syarat & Ketentuan Layanan`; verify the full TOS/Privacy text opens above the app shell.
2. Scroll the document from top to bottom.
3. Close it using the top-right X and bottom TUTUP button; confirm Settings is restored.
4. From Register, tap the TOS link; confirm it opens without submitting the form or toggling the consent checkbox unintentionally.
5. Close the TOS page and confirm Register remains visible and the submit button still requires the consent checkbox.

## Regression checks
- Open/close Settings, About, Help, Language, Share, and Backup modals.
- Check body scroll lock is applied while a modal is open and released after the final modal closes.
- Confirm the timer, AI Telemetry, AI Analysis, AI Tips, online language selection, and Android native Share remain available.

## Release caveat
Automated source tests do not replace UI testing on physical devices. Gradle build and physical PWA/APK testing remain the operator's responsibility.
