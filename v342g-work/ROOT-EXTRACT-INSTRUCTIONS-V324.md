# Petunjuk Ekstraksi dan GitHub — V324

1. Buat backup perubahan lokal yang belum di-commit.
2. Ekstrak seluruh isi ZIP langsung ke `C:\xampp\htdocs\proofing-donat-baru` (root repository), bukan ke subfolder versi baru.
3. Jangan menghapus folder `.git`, `.env`, atau file konfigurasi rahasia.
4. Jalankan:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm test
git diff --check
git status --short
```

5. Tinjau daftar perubahan. Pastikan `.env`, API key, password, credential, dan file lokal rahasia tidak ikut di-stage.
6. Stage, commit, dan push ke branch Preview yang sedang digunakan:

```powershell
git add -A
git diff --cached --check
git status
# Periksa ulang daftar file staged sebelum commit.
git commit -m "V324: Fix mini stats tap and onboarding swipe"
git push origin fix/v318-vercel-output-directory
```

7. Tunggu deployment Preview V324 selesai melalui integrasi GitHub/Vercel. Uji Preview sebelum merge ke `main`.

## Uji manual yang disarankan

- Login dan scroll sampai `location-section` menyusut.
- Tap `shrunk-main`: suhu dan kelembapan harus bertukar posisi.
- Tap `shrunk-sub`: posisi harus bertukar kembali.
- Ulangi dengan tap cepat dan sentuhan di HP; satu tap hanya boleh memicu satu pertukaran.
- Pada `#onboarding-screen`, geser kiri dan kanan di area ilustrasi/teks slide; indikator dan tombol harus mengikuti slide aktif.
- Geser vertikal pada onboarding tidak boleh mengubah slide.
- Tombol Lanjutkan, Lewati, dan titik indikator harus tetap bekerja.
- Pastikan scroll timer, efek shrink, AI, dan Premium Print V323 tetap berfungsi.

Versi aplikasi yang terlihat oleh pengguna tetap `V125`; V324 adalah revisi teknis.
