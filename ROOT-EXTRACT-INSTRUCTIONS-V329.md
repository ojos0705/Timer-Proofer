# Petunjuk pemasangan V329

1. Buat backup folder proyek dan pastikan commit lokal sebelumnya aman.
2. Ekstrak isi ZIP langsung ke root repository:
   `C:\xampp\htdocs\proofing-donat-baru`
3. Jangan menghapus atau menimpa `.git`, `.env`, `android/local.properties`, atau file rahasia lokal.
4. Di PowerShell:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
node scripts/sync-web-assets.mjs
node scripts/verify-release.mjs
node scripts/audit-function-names.mjs
node --test tests/*.test.mjs
git diff --check
git status --short
```

5. Periksa staging agar `.env`, API key, token, password, dan file lokal rahasia tidak ikut commit.
6. Commit dan push ke branch Preview:

```powershell
git add -A
git diff --cached --check
git status
# Pastikan tidak ada rahasia sebelum melanjutkan.
git commit -m "V329: Stabilize telemetry, language loader and recipe AI; refine Android PiP"
git push origin fix/v318-vercel-output-directory
```

7. Uji deployment Preview. Setelah lolos, buat Pull Request ke `main` dan merge agar Vercel menerbitkannya ke Production.

## Pengujian manual yang harus dilakukan

### PWA dan APK
- Ganti jenis produk ke Donat, Roti, Bakpao, Pizza, dan Salt Bread; jalankan AI Telemetry; pastikan tujuh judul dan urutannya sama pada semua produk serta perangkat.
- Pilih Abkhaz (`ab`) ketika internet aktif; pastikan dropdown widget siap dan terjemahan diterapkan sebelum modal ditutup.
- Simpan satu resep, jalankan AI Analysis, tutup editor ke master, lalu buka resep yang sama dan resep lain. Hasil sebelumnya tidak boleh muncul sampai analisis baru diminta.
- Di layar HP, tekan tombol AI Tips dan pastikan label loading tidak keluar dari card.

### Android PiP
- Tutup PWA Timer Proofer di Chrome sebelum pengujian APK agar tidak keliru melihat task PWA lama di belakang PiP.
- Mulai countdown, tekan Back satu kali.
- Pastikan Activity masuk system PiP dan Home launcher tampil di belakangnya.
- Buka aplikasi lain, pastikan satu jendela PiP tetap terlihat dan countdown berjalan.
- Ketuk PiP, pastikan aplikasi kembali fullscreen tanpa kehilangan waktu.

Catatan: PiP Android hanya tersedia pada perangkat/versi yang mendukungnya dan izin PiP aplikasi harus aktif di pengaturan Android.
