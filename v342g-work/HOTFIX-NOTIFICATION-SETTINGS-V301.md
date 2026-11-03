# Hotfix V301 — Modal Notifikasi dan Pengaturan

Tanggal: 2026-10-27
Basis: Timer-Proofer ES6 Modular V300

## Akar masalah yang ditemukan

`assets/js/core/event-delegation.js` dan `assets/js/modal-bootstrap.js` sama-sama memasang listener `click` pada fase capture untuk aksi `data-action="toggleModal"`. Modul delegasi umum dimuat dari graph bootstrap sebelum listener modal independen dipasang. Saat pengguna menekan tombol, kedua listener dapat memanggil `toggleModal()` pada modal yang sama: pemanggilan pertama membuka modal dan pemanggilan kedua menutupnya kembali. Efek yang terlihat adalah tombol Notifikasi/Pengaturan tidak merespons.

## Perbaikan

- `event-delegation.js` melewati aksi `toggleModal` ketika `window.__TP_MODAL_BOOTSTRAP__ === true`.
- `modal-bootstrap.js` tetap menjadi pemilik tunggal untuk aksi modal kritis.
- Fallback delegasi umum tetap tersedia apabila bootstrap independen tidak aktif.
- Menambahkan tes regresi agar kepemilikan tunggal ini tidak terhapus pada refaktor berikutnya.
- Cache-bust modul diperbarui ke `20261027-v301`; cache Service Worker diperbarui ke `Timer-Proofing-v1.1.207` agar aset lama tidak terus dipakai oleh PWA yang sudah terpasang.

## Audit markup

- Parser HTML lxml dapat mem-parsing `www/index.html` tanpa melaporkan kesalahan parser.
- `#notif-modal` dan `#settings-modal` masing-masing ditemukan satu kali.
- ID penting `#global-notif-badge`, `#btn-close-setting`, dan `#btn-close-notif-modal` masing-masing ditemukan satu kali.
- Pemeriksaan rilis: 299 ID, tidak ada ID duplikat, 0 impor lokal hilang, 0 handler inline.

Catatan: parser yang berhasil membaca HTML bukan bukti formal bahwa setiap elemen memiliki tag penutup eksplisit; HTML memiliki elemen void dan aturan penutupan implisit. Tidak ada bukti dari pemeriksaan ini bahwa tag yang tidak berpasangan adalah penyebab modal tidak merespons.

## Hasil tes

`npm test`: 389 lulus, 0 gagal. Pemeriksaan rilis dan audit deklarasi fungsi juga lulus.

## Pengujian yang masih harus dilakukan

Uji pada perangkat Android APK yang dibangun dari V301: tekan tombol Notifikasi dan Pengaturan berulang kali; pastikan modal tampil satu kali, tombol tutup bekerja, scroll terkunci saat modal terbuka dan kembali normal setelah ditutup. Ulangi dengan navigasi sentuh dan mouse pada browser/PWA. Pengujian perangkat nyata belum dijalankan dari lingkungan ini.
