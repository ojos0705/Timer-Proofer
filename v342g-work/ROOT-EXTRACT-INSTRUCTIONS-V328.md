# Petunjuk Instalasi V328 — Root Extract

## Tujuan
Patch V328 memperbaiki penghentian preview nada alarm saat menyimpan preferensi dan memastikan APK Capacitor Android hanya memakai system Activity PiP, tidak membuat PiP video browser tambahan.

## Ekstraksi
1. Tutup server/dev tools yang sedang menjalankan proyek.
2. Buat backup folder `C:\xampp\htdocs\proofing-donat-baru`.
3. Ekstrak isi ZIP langsung ke `C:\xampp\htdocs\proofing-donat-baru` (root repository).
4. Jangan hapus `.git`, `.env`, `android/local.properties`, maupun file konfigurasi lokal.

## Tes lokal
Jalankan PowerShell:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm test
node --check assets/js/features-preferences.js
node --check assets/js/proofing-alarm-service.js
node --check assets/js/app-core.js
git diff --check
git status --short
```

Sebelum commit, pastikan tidak ada `.env`, API key, password, sertifikat, atau file rahasia masuk ke staging.

## Push Preview
Gunakan branch kerja yang sudah dipakai:

```powershell
git add -A
git diff --cached --check
git status
git commit -m "V328: Stop alarm preview on save and isolate native PiP"
git push origin fix/v318-vercel-output-directory
```

Uji Preview sebelum merge ke `main`.

## Build APK Android
Setelah source diekstrak:

```powershell
npm run sync:android
cd android
.\gradlew.bat :app:assembleDebug
```

`android/local.properties` dipertahankan dari komputer lokal dan tidak dibagikan melalui ZIP.

## Uji manual
### Alarm preview
1. Buka Preferensi → Suara & Getaran.
2. Pastikan Aktifkan Suara Alarm dicentang.
3. Pilih `Nada Kustom (Audio File)` dan pastikan preview mulai berbunyi.
4. Tekan **SIMPAN PENGATURAN**.
5. Pastikan suara langsung berhenti, tidak muncul lagi setelah modal tertutup, dan pilihan nada tetap tersimpan.
6. Buka preferensi lagi, lalu matikan checkbox suara; preview yang sedang berbunyi harus segera berhenti.

### PWA
1. Uji tombol PiP pada PWA di browser yang mendukung PiP.
2. Pastikan PiP PWA tetap berfungsi seperti sebelum V328.

### Android APK
1. Instal APK yang dibangun dari source V328.
2. Jalankan countdown, lalu tekan tombol Back Android.
3. Pastikan yang masuk PiP adalah satu Activity native Timer Proofer.
4. Pastikan layar di belakang PiP adalah Home/launcher atau aplikasi sebelumnya, dan pengguna bisa berpindah ke aplikasi lain.
5. Ketuk PiP untuk kembali ke Activity penuh; countdown harus tetap berjalan.
6. Pastikan tidak ada jendela video PiP kedua.

Catatan: Android system PiP selalu berupa Activity yang berada di atas layar Home/aplikasi lain. Layar latar bukan instance kedua dari Activity PiP. Jika PWA Timer Proofer masih terbuka di Chrome, PWA tersebut adalah konteks browser terpisah dari APK.
