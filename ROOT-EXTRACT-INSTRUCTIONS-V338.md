# Timer Proofer V338 — Root Extract Instructions

1. Backup folder proyek `C:\xampp\htdocs\proofing-donat-baru` atau commit perubahan lokal yang belum disimpan.
2. Ekstrak seluruh isi ZIP langsung ke root `C:\xampp\htdocs\proofing-donat-baru`; jangan membuat folder pembungkus baru.
3. Jangan menimpa `.git`, `.env`, `.env.local`, atau `android/local.properties`.
4. Jalankan pemeriksaan source:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm ci
npm test
git diff --check
git status --short
```

5. Tinjau semua perubahan dan pastikan file rahasia tidak masuk staging.
6. Build dan instal APK:

```powershell
npm run sync:android
cd android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug
```

7. Uji manual sesuai `MANUAL-DEVICE-TEST-PLAN-V338.md`.
8. Push ke branch Preview, uji deployment web, lalu merge ke `main` hanya setelah pemeriksaan selesai.

Versi produk tetap V125. Revisi teknis V338 memakai release token `20261101-v338` dan Service Worker cache `Timer-Proofing-v1.1.240`.
