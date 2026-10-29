# Timer Proofer V312 — About Modal Version Fix

## Masalah
Label `#about-menu-version` dan `#about-app-version` dapat tertinggal pada `Memuat versi...` jika pembaruan metadata tidak berjalan atau permintaan metadata gagal sebelum label diperbarui.

## Perubahan
- `updateVersion()` sekarang langsung merender fallback rilis `V312`, jadi label tidak menunggu jaringan untuk menampilkan versi.
- Metadata dibaca dari URL yang dibentuk berdasarkan `import.meta.url`, bukan path relatif terhadap URL halaman, dan menggunakan cache mode `no-store` serta token rilis.
- `window.updateVersion` menjadi bridge yang eksplisit agar controller modal dapat menyegarkan metadata ketika `about-modal` dibuka.
- Kegagalan memuat metadata tidak menghapus fallback; hanya mencatat peringatan diagnostik.
- Menjaga ID elemen HTML, `data-action="toggleModal"`, dan `data-arg="about-modal"` tetap sama.
- Versi aplikasi dinaikkan ke `V312`, token runtime `20261027-v316`, cache Service Worker `Timer-Proofing-v1.1.217`.

## Verifikasi yang dijalankan
- `node --check` pada modul yang diubah: lulus.
- `scripts/sync-web-assets.mjs`: lulus; 74 jalur precache tervalidasi.
- `scripts/verify-release.mjs`: lulus; 236 file JavaScript diperiksa, 2 HTML, 300 ID, 0 import hilang, 0 ID duplikat, 0 inline handler.
- `scripts/audit-function-names.mjs`: lulus; 0 deklarasi fungsi duplikat di dalam modul.
- `node --test tests/*.test.mjs`: 406 lulus, 0 gagal.

## Batas pengujian
Belum dilakukan uji browser interaktif langsung, uji offline nyata, atau uji perangkat Android/iOS. Lakukan hard refresh / update PWA setelah deploy dan buka Tentang untuk memverifikasi UI di perangkat target.
