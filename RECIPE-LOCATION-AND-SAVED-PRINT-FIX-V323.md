# Timer Proofer V323 — Location Header Scroll + Saved Recipe Premium Print

## Perubahan

### 1. `location-section` shrink saat scroll
- Inisialisasi tetap aman bila `app-core.js` dievaluasi sebelum atau sesudah `DOMContentLoaded`.
- Scroll listener menggunakan capture di tingkat dokumen untuk menangkap event scroll yang tidak bubble dan tetap mendeteksi node scroller yang diganti.
- Resolusi `.scrollable-content` dilakukan ulang saat interaksi.
- Membaca `scrollTop` pada kontainer utama, dokumen, window, dan ancestor scrollable yang berada di dalam `#app-container`.
- Wheel dan touch listener di tingkat dokumen menjadi fallback untuk WebView yang terlambat/tidak konsisten mengirim scroll event.
- Interaksi dalam modal yang berada di luar area konten timer tidak mengubah state header.

### 2. Print pada dropdown resep tersimpan
- Tombol `.recipe-print-btn` kini menggunakan pipeline PDF Premium yang sama dengan `eksekusiCetakPremium()`.
- `cetakResepTersimpanPremium(resep)` menghidrasi data resep tersimpan ke editor kalkulator untuk sementara, merender bahan dan langkah produksi, menjalankan ulang kalkulasi HPP, lalu menunggu layout sebelum meminta PDF Premium.
- State editor yang sedang dikerjakan pengguna (nama, tepung, yield, harga, bahan, langkah, kategori dan food cost) dipulihkan pada `finally`, termasuk saat proses cetak gagal.
- Tidak lagi membuka popup cetak ringkas terpisah.

### 3. Sinkronisasi
- `assets/js/` disinkronkan ke `www/assets/js/`.
- `api/` disinkronkan ke `www/public/api/`.
- Service Worker cache teknis: `Timer-Proofing-v1.1.225`.
- Release token: `20261030-v323`.
- Label versi aplikasi tetap `V125`.

## Verifikasi
- `node --test tests/*.test.mjs`: 428 lulus, 0 gagal.
- `node scripts/verify-release.mjs`: lulus; 74 precache assets diverifikasi, 67 modul dalam graph entrypoint, 246 file JavaScript, 2 HTML, 300 ID; 0 import hilang, 0 ID duplikat, 0 handler inline.
- `node scripts/audit-function-names.mjs`: 0 deklarasi fungsi duplikat dalam modul yang sama.
- `node --check assets/js/app-core.js`, `node --check www/assets/js/app-core.js`, `node --check www/sw.js`: lulus.

## Batas verifikasi
Pengujian browser langsung, Android Capacitor, iOS, dan hasil file PDF fisik belum dilakukan dalam lingkungan ini. Setelah deployment Preview, uji scroll dengan roda mouse dan gesture sentuh; pastikan `#location-section` menambahkan class `shrunk` ketika scroll ke bawah dan menghapusnya kembali saat kembali ke atas. Uji tombol Print pada beberapa resep tersimpan, dan pastikan dokumen berisi bahan, kalkulasi, ringkasan, dan langkah produksi.
