# Hotfix V302 — Modal Notifikasi dan Pengaturan

Tanggal: 2026-10-27
Basis: Timer-Proofer ES6 Modular V301 ZIP yang sudah tersedia.

## Temuan terkonfirmasi

Diagnostik browser menunjukkan `#notif-modal` dan `#settings-modal` adalah keturunan `#user-modal`. Ketika `#user-modal` berstatus `display: none`, kedua modal anak tidak dapat dirender; memaksa `display:flex` pada anak tidak mengatasi ancestor tersembunyi. Pengujian manual pengguna menunjukkan kedua modal memperoleh ukuran viewport setelah dipindahkan ke `document.body`.

## Perbaikan

- `modal-bootstrap.js`: saat bootstrap diinisialisasi, pindahkan hanya elemen `#notif-modal` dan `#settings-modal` ke `document.body` jika masih berada di dalam `#user-modal`.
- ID, kelas, isi, atribut aksi, dan tombol yang ada dipertahankan.
- Cache-busting modul dinaikkan ke `20261027-v302`; cache Service Worker dinaikkan ke `Timer-Proofing-v1.1.208`.
- Metadata versi dan tes yang memvalidasi token rilis diselaraskan ke V302.

## Verifikasi yang dijalankan

- `npm test`: 389 lulus, 0 gagal.
- Pemeriksaan rilis statis: lulus; 299 ID HTML, tidak ada ID duplikat, 0 impor lokal hilang, 0 handler inline.
- Audit deklarasi fungsi: 0 deklarasi fungsi bernama duplikat di dalam modul yang sama.

## Batas verifikasi

Tes otomatis di atas bukan pengujian browser end-to-end. Setelah mengekstrak paket, lakukan hard reload atau hapus data situs/Service Worker lama, lalu uji tombol Notifikasi/Pengaturan, tombol tutup, backdrop, scroll lock, dan navigasi sentuh pada browser/PWA. Build dan uji APK Android/iOS juga belum dijalankan dari lingkungan ini.
