# Timer-Proofer ES6 Modular V303 — Recipe Detail Fix

Tanggal: 2026-10-27
Basis: arsip V302 yang tersedia pada percakapan.

## Perubahan

1. `assets/js/app-core.js` dan `www/assets/js/app-core.js`
   - Mengekspos `handleFotoLangkah` pada `window` agar kontrak handler lama `data-onchange="window.handleFotoLangkah(this, index)"` benar-benar dapat memanggil fungsi di dalam ES module.
   - Memvalidasi indeks, file, tipe `image/*`, batas ukuran 2 MB, dan kegagalan `FileReader`.
   - Memperbarui state langkah dan memanggil ulang `renderLangkahProduksi()` setelah foto berhasil dibaca agar thumbnail/status segera tampil.
   - Input dikosongkan setelah pemrosesan supaya file yang sama bisa dipilih ulang.
2. `www/index.html`
   - Menambahkan aturan CSS yang membuat panel metode resep dan daftar langkah mengisi lebar konten editor, serta menghindari flex shrink/min-content sizing.
   - Mempertahankan ID, kelas, atribut data-action/data-onchange, dan struktur DOM yang sudah ada.
3. Token cache-busting modul dinaikkan secara konsisten ke `20261027-v303`; cache Service Worker menjadi `Timer-Proofing-v1.1.209`.
4. Memperbarui ekspektasi tes yang terkait token rilis/cache.

## Verifikasi yang dijalankan

- `npm test`: LULUS.
- `scripts/verify-release.mjs`: 67 modul lokal dalam graph entrypoint; 230 file JavaScript diperiksa; 2 HTML diperiksa; 299 ID; 0 import hilang; 0 ID duplikat; 0 handler inline; 0 override scroll lock.
- Tes otomatis: 389 lulus, 0 gagal.

## Batasan

Tes otomatis dan audit statis lulus, tetapi belum ada pengujian interaktif nyata di browser, PWA terpasang, atau Android/iOS. Perlu verifikasi manual untuk memilih foto, melihat thumbnail, membuka preview besar, menyimpan/membuka ulang resep, dan memeriksa layout pada ukuran layar berbeda.
