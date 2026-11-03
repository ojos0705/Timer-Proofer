# Petunjuk Ekstraksi V339

1. Cadangkan proyek lokal `C:\xampp\htdocs\proofing-donat-baru` dan simpan/commit perubahan lokal yang belum masuk Git.
2. Ekstrak seluruh isi ZIP langsung ke root repository `C:\xampp\htdocs\proofing-donat-baru` (bukan ke folder V339 baru).
3. Jangan menimpa atau menghapus `.git`, `.env`, `.env.local`, `android/local.properties`, API keys, token, atau file pribadi.
4. Dari PowerShell:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm ci
npm test
git diff --check
git status --short
```

5. Periksa diff dan pastikan hanya perubahan yang diharapkan masuk ke commit.
6. Untuk menguji APK:

```powershell
npm run sync:android
cd android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug
```

7. Uji daftar Pengaturan di PWA dan APK, termasuk label yang diterjemahkan dan skala font sistem. Pastikan seluruh 11 baris memakai hirarki yang sama dan setiap menu tetap membuka tujuan semula.
8. Push ke branch Preview, uji deployment Preview, lalu gabungkan ke `main` untuk Production setelah lolos.

Versi produk tetap V125. V339 adalah revisi teknis dengan release token `20261101-v339` dan cache Service Worker `Timer-Proofing-v1.1.241`.
