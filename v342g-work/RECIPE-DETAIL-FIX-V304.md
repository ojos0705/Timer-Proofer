# Timer Proofer — Recipe Detail Fix V304

Tanggal: 2026-10-27
Basis: arsip V303 yang tersedia pada percakapan.

## Perbaikan

1. **Preview foto resep tidak lagi bergantung pada modal profil.** `#modal-preview-foto` dipindahkan ke `document.body` saat inisialisasi modal (dan dipastikan lagi saat dibuka). Ini mengatasi keadaan saat preview sudah `display:flex` tetapi tidak tampak karena masih menjadi keturunan `#user-modal` yang `display:none`; ketika profil dibuka, overlay lama tampak mendadak.
2. **Preview foto pada `#recipe-photo-grid`.** Perilaku canonical `RecipePhotoService.triggerUpload()` dipertahankan: slot kosong membuka file picker, slot yang memiliki gambar membuka `window.previewRecipePhoto()`.
3. **Panel `method-content` tidak lagi diubah menjadi flex container saat tab dipilih.** `gantiTabMetode()` kini menampilkan panel aktif dengan `display:block`, sesuai alur konten vertikal bahan/HPP dan langkah produksi, sehingga isi tidak menyusut karena aturan flex.
4. Versi/build dinaikkan ke V304 dan token cache-busting modul aktif diselaraskan ke `20261027-v304`. Cache Service Worker tetap `Timer-Proofing-v1.1.209`.
5. Menambahkan tes regresi khusus untuk tiga jalur di atas.

## Pengujian

- `npm run test:unit`: **392 tes lulus, 0 gagal** (389 tes sebelumnya + 3 tes regresi V304).
- `node --check` untuk `assets/js/modal.js`, `assets/js/app-core.js`, `assets/js/core/event-delegation.js`, `assets/js/recipe-photo-service.js`, serta pasangan modul di `www/assets/js/`: lulus.
- Pengujian interaktif browser/Capacitor belum dijalankan di perangkat pengguna; harus dikonfirmasi setelah ekstrak dan reload V304.

## Cara uji manual

1. Ekstrak ke folder baru dan jalankan folder `www` versi V304.
2. Buka detail resep, unggah foto ke `recipe-photo-grid`, lalu klik thumbnail. Preview harus muncul segera, tanpa membuka Profil Pengguna.
3. Tutup preview dan klik tombol Profil Pengguna; preview tidak boleh muncul kembali.
4. Pada halaman resep, pindah dari `Bahan & HPP` ke `Cara Pembuatan`, lalu kembali. `DAFTAR KOMPONEN BAHAN ADONAN` harus tetap memenuhi lebar panel dan tidak menyusut.
5. Ulangi dengan klik/touch, lalu reload penuh agar cache modul dan Service Worker baru aktif.
