# Audit Arsitektur ES6 — V300

Tanggal: 2026-10-26

## Perbaikan V300 — paket web produksi dan Capacitor

- `capacitor.config.json` menetapkan `webDir: "www"`, sedangkan V299 menyimpan sumber `assets/` dan `vendor/` di root repository. Akibatnya, `www/index.html` merujuk `./assets/js/runtime-entry.js` yang tidak ada di direktori produksi dan entrypoint `www/app.js` merujuk `./assets/js/boot.js` yang juga tidak ada. Ini merupakan ketidaksesuaian packaging yang dapat menghentikan evaluasi modul sebelum UI autentikasi diinisialisasi.
- Menambahkan `scripts/sync-web-assets.mjs` untuk menyalin `assets/`, `vendor/`, `logo-donat.svg`, dan `version.json` dari sumber kanonis ke `www/`, serta memvalidasi entrypoint penting.
- Menambahkan `npm run build:web` dan `npm run sync:android`. Sinkronisasi Android menjalankan Capacitor CLI melalui Node agar tidak bergantung pada bit executable shim.
- Memperbaiki verifier rilis agar mengabaikan hasil build Android yang dihasilkan dan memvalidasi `www/index.html`, `www/sw.js`, precache, dan graph modul produksi sesuai `webDir`.
- Memperbaiki tes dan server QA yang sebelumnya mengasumsikan `index.html` dan `sw.js` berada di root. Tidak ada ID, class, atribut, selector, atau markup UI yang diubah.
- Cache boundary diperbarui ke `Timer-Proofing-v1.1.206`, token runtime `20261026-v300`.

## Validasi yang dijalankan

- `npm test`: 388 lulus, 0 gagal.
- Release verifier: 0 import relatif hilang, 0 ID duplikat, 0 handler inline, 0 override scroll lock; 67 modul dalam graph runtime, 74 entry precache.
- `node node_modules/@capacitor/cli/bin/capacitor sync android`: sukses; aset web disalin ke `android/app/src/main/assets/public` dan plugin Android disinkronkan.

## Batas validasi

Build APK/Gradle penuh, browser E2E visual, autentikasi Supabase nyata, dan pengujian perangkat Android/iOS fisik belum dilakukan. Perbaikan packaging menghilangkan jalur modul yang terbukti hilang dalam arsip, tetapi keberhasilan login/register tetap perlu diverifikasi pada APK hasil build dengan log runtime dan koneksi backend yang nyata.
