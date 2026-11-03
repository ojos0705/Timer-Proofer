# V314 — Indikator pemulihan sesi autentikasi

## Perubahan
- Mekanisme `auth-pending` dipertahankan agar UI login/registrasi tidak muncul sebelum status sesi Supabase dipulihkan.
- Teks `Memeriksa sesi akun...` diganti dengan spinner CSS sederhana.
- Animasi menghormati preferensi `prefers-reduced-motion` dengan memperlambat animasi.
- Tidak mengubah ID, class, atribut, selector, struktur elemen, maupun alur sinkronisasi gamifikasi.

## Catatan
Pemulihan sesi Supabase menentukan identitas/status autentikasi pengguna. Itu bukan sinkronisasi gamifikasi itu sendiri; sinkronisasi gamifikasi yang bergantung pada pengguna dapat berjalan setelah status autentikasi diketahui.

## Verifikasi
- `npm test`: 406 tes lulus, 0 gagal.
- Verifikasi statis release: lulus; 74 aset precache, 67 modul entrypoint, 0 import hilang, 0 ID duplikat, 0 handler inline.
- Belum menggantikan pengujian langsung di browser, PWA terpasang, Android Capacitor, atau iOS.
