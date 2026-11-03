# Petunjuk Ekstraksi V330

1. Cadangkan proyek `C:\xampp\htdocs\proofing-donat-baru` dan pastikan perubahan lokal sudah disimpan/di-commit.
2. Ekstrak seluruh isi ZIP V330 langsung ke root repository tersebut. Jangan menimpa `.git`, `.env`, `.env.local`, atau `android/local.properties`.
3. Jalankan PowerShell:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm ci
npm test
git diff --check
```

4. Periksa `git status --short` dan staged diff. Pastikan tidak ada token, API key, password, atau file rahasia.
5. Commit dan push ke branch Preview yang aktif:

```powershell
git add -A
git diff --cached --check
git status
git commit -m "V330: Fix Android App Tour safe-area and Back navigation"
git push
```

6. Setelah Preview web terverifikasi, sinkronkan dan build APK:

```powershell
npm run sync:android
cd android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug
```

7. Uji fisik di Android: login pertama, App Tour langkah 1–5, khususnya langkah 2; pastikan tombol Selanjutnya terlihat, card bisa digulir bila perlu, Back pada langkah 2 kembali ke langkah 1 tanpa menutup aplikasi, dan Back pada langkah 1 menutup tour tanpa menutup aplikasi.

Versi produk tetap `V125`. V330 hanya revisi teknis/cache. Jangan merge ke `main` sebelum pengujian perangkat selesai.
