# Timer-Proofer ES6 Modular V309

## Perbaikan
- `help-modal` dan seluruh modal tujuan submenu Pengaturan dipindahkan ke `document.body` saat masih berada di dalam `#user-modal`.
- Penyebab masalah: modal Bantuan sebelumnya merupakan turunan `#user-modal`; ketika alur navigasi menutup profil, parent yang tersembunyi ikut menyembunyikan halaman Bantuan walaupun modal child sudah diaktifkan.
- Perubahan hanya memindahkan node modal yang sudah ada. ID, isi HTML, class, atribut, dan kontrak `data-action` dipertahankan.
- Nama arsip dan folder akar disamakan: `Timer-Proofer-ES6-Modular-V309`.
- Cache Service Worker diperbarui menjadi `Timer-Proofing-v1.1.214`, runtime module URL menjadi `20261027-v309`.

## Validasi otomatis
- `npm test`: 402 lulus, 0 gagal.
- Audit release: 0 import hilang, 0 ID HTML duplikat, 0 handler inline, 0 aset lokal precache hilang.
- Audit fungsi: 0 deklarasi function duplikat di modul yang sama.

Catatan: pengujian visual manual di browser, PWA terpasang, Android Capacitor, dan iOS belum dilakukan.
