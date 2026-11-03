# App Tour Android Safe-Area & Back Navigation — V330

## Masalah yang ditangani

Pada perangkat Android, kartu App Tour dapat terposisi melewati area WebView yang terlihat sehingga tombol `#tour-btn-next` tertutup area navigasi sistem. Tombol Back juga sebelumnya dapat diteruskan ke fallback minimize aplikasi ketika timer tidak aktif, karena callback lifecycle hanya mengurus PiP saat countdown berjalan.

## Perubahan

1. `assets/js/features-onboarding.js`
   - Mengukur konten step terbaru sebelum menghitung posisi tooltip.
   - Menggunakan `visualViewport` bila tersedia, membaca safe-area CSS, dan membatasi posisi kartu di dalam viewport.
   - Menghitung ulang posisi ketika viewport/scroll berubah.
   - Menambahkan `isTourActive()` dan `handleBackButton()`: Back pada langkah 2+ kembali satu langkah; Back pada langkah pertama menutup tour.
2. `www/index.html`
   - Membatasi tinggi kartu berdasarkan `100dvh` dan safe-area Android.
   - Mengaktifkan scroll vertikal yang aman pada kartu.
   - Menjaga footer tombol tetap terlihat ketika isi kartu perlu digulir.
3. `assets/js/app-core.js`
   - Memprioritaskan App Tour sebelum keputusan Back untuk timer/PiP/minimize.
4. Tidak mengubah ID, class, struktur DOM, alur login, AI, timer, atau plugin PiP native.

## Versi dan cache

- Versi produk yang ditampilkan: `V125` (tidak berubah).
- Revisi teknis: `V330`.
- Release token: `20261101-v331`.
- Service Worker cache: `Timer-Proofing-v1.1.232`.

## Validasi

Tes regresi V330 memeriksa batas viewport, safe-area, scroll kartu, urutan pengukuran konten, dan prioritas Android Back. Tes statis tidak menggantikan verifikasi pada perangkat fisik; pengujian wajib setelah instalasi APK mencakup layar pendek, posisi langkah 2, tombol Selanjutnya, scroll kartu, Back untuk kembali satu langkah, dan penyelesaian tour.
