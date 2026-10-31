# Petunjuk Ekstraksi dan Deployment V326

1. Backup folder kerja yang sedang dipakai.
2. Ekstrak seluruh isi ZIP langsung ke root repository:
   `C:\xampp\htdocs\proofing-donat-baru`
3. Jangan hapus folder `.git`, `.env`, `.env.local`, atau `android/local.properties`.
4. Jalankan pemeriksaan lokal:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
node scripts/sync-web-assets.mjs
node scripts/verify-release.mjs
node scripts/audit-function-names.mjs
node --test tests/*.test.mjs
```

5. Periksa `git status --short` dan pastikan tidak ada API key, password, token,
   atau file rahasia yang akan di-commit.
6. Stage dan commit perubahan setelah daftar file diperiksa:

```powershell
git add -A
git diff --cached --check
git status
# Periksa perubahan yang akan dikirim sebelum commit.
git commit -m "V326: Restore PWA PiP, Back guard, fullscreen article and onboarding preview"
git push origin fix/v318-vercel-output-directory
```

7. Tes Preview terlebih dahulu, kemudian buat Pull Request dari
   `fix/v318-vercel-output-directory` ke `main`. Merge hanya setelah lulus uji.

## Android / Capacitor build

Native PiP mengubah Java dan AndroidManifest; setelah ekstraksi, rebuild APK:

```powershell
npm run sync:android
cd android
.\gradlew.bat :app:assembleDebug
```

Pastikan izin Picture-in-Picture untuk Timer Proofer di pengaturan Android
aktif. Perangkat harus mendukung Android 8.0/API 26 atau lebih baru.

## Manual test checklist

- PWA Chrome Android: mulai countdown, tekan Back; tidak boleh ada dialog
  “Keluar dari situs”. Browser mencoba video PiP dan menggunakan widget mini
  dalam aplikasi bila permintaan OS PiP ditolak.
- PWA Chrome Android: ketuk tombol PIP Mode langsung saat timer berjalan untuk
  menguji PiP video dalam konteks user gesture.
- PiP: tutup PiP melalui tombol PiP aplikasi atau sistem; label tombol kembali normal.
- Capacitor Android: mulai countdown, tekan Back/Home; native PiP harus muncul.
- Capacitor Android: expand PiP; WebView kembali ke layout normal dan timer tetap berjalan.
- Artikel: ketuk salah satu article-slide; modal detail harus menutupi viewport
  penuh dan isi dapat discroll; tombol close mengembalikan halaman.
- Onboarding: buka URL dengan `?tp-onboarding-preview=1&reset=1`.
- Selesaikan onboarding; jika sudah login, Welcome Screen tampil. Uji swipe kanan/kiri.

Catatan: hasil automated tests tidak menggantikan uji perangkat Android nyata.
