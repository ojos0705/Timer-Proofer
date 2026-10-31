# Petunjuk Ekstraksi dan Deployment V327

1. Buat backup folder proyek lokal.
2. Ekstrak seluruh isi ZIP langsung ke root repository:
   `C:\xampp\htdocs\proofing-donat-baru`
3. Jangan hapus `.git`, `.env`, `.env.local`, atau `android/local.properties`.
4. Jalankan pemeriksaan:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm test
git diff --check
git status --short
```

5. Periksa daftar perubahan. Pastikan tidak ada API key, password, token, atau file rahasia yang akan di-commit.
6. Stage, tinjau staged diff, commit, lalu push ke branch Preview:

```powershell
git add -A
git diff --cached --check
git status
# Periksa daftar file sebelum commit.
git commit -m "V327: Make app shell fixed and route Android Back to system PiP"
git push origin fix/v318-vercel-output-directory
```

7. Uji Preview web terlebih dahulu. Setelah itu build APK lokal:

```powershell
npm run sync:android
cd android
.\gradlew.bat :app:assembleDebug
```

8. Install APK di HP Android. Aktifkan izin Picture-in-Picture jika Android memintanya. Uji countdown, tombol Back, system PiP, expand PiP, serta scroll halaman dari bawah kembali ke atas.
9. Setelah hasil Preview dan perangkat sesuai, buat Pull Request dari `fix/v318-vercel-output-directory` ke `main`. Merge hanya setelah uji perangkat selesai.

Product-facing version tetap V125. Cache teknis V327 menggunakan `Timer-Proofing-v1.1.229` dan release token `20261030-v327`.
