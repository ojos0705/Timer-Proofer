# V313 — Manual Version Control & Auth Startup Fix

## Mengatur versi yang terlihat pengguna

Untuk mengatur nomor yang terlihat pengguna, edit nilai `version` di `version.json` (dan pastikan salinan `www/version.json` serta `assets/js/version.json` ikut sinkron sebelum deploy):

```json
{
  "version": "V125",
  "build": "release-managed-by-version-json",
  "releaseToken": "20261027-v316",
  "serviceWorker": "Timer-Proofing-v1.1.219",
  "releaseDate": "2026-10-27"
}
```

`version` adalah nomor yang tampil di Profil/Tentang. Ganti `V125` ke nomor pilihan Anda. `releaseToken`, `build`, dan cache Service Worker adalah metadata teknis internal. Anda dapat mengganti `version` tanpa harus menyamakan nomor versi produk dengan token cache. Jika mengubah kode, naikkan `releaseToken` dan cache Service Worker untuk membuang aset lama.

## Mengapa layar login/register sempat muncul setelah login

HTML sebelumnya dimulai dengan `body.logged-out`, sehingga CSS langsung menampilkan form login sebelum Supabase selesai memulihkan sesi tersimpan. V313 memulai dengan `auth-pending`, menampilkan pesan pemeriksaan sesi, lalu `auth-service.js` memilih layar login atau aplikasi setelah status sesi diketahui. Jika SDK gagal memuat selama 12 detik, layar autentikasi ditampilkan sebagai fallback; sesi yang berhasil dipulihkan kemudian tetap dapat mengoreksi UI.

## Catatan

Tes statis/sintaks perlu dijalankan setelah ekstraksi. Uji langsung tetap diperlukan pada browser, PWA terpasang, dan Android Capacitor, terutama sesi tersimpan, offline, logout, dan sesi kedaluwarsa.
