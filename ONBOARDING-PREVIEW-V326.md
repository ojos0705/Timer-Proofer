# Menampilkan Ulang Onboarding dan Welcome untuk QA — V326

Gunakan URL berikut pada domain Preview atau Production:

`https://DOMAIN-APLIKASI/?tp-onboarding-preview=1&reset=1`

Contoh Production:

`https://timer-proofer.vercel.app/?tp-onboarding-preview=1&reset=1`

Ketika URL dibuka:
1. Onboarding walkthrough akan ditampilkan walaupun `tp_onboarding_seen` sudah tersimpan.
2. Setelah onboarding diselesaikan/dilewati, Welcome Screen akan muncul jika pengguna sudah login.
3. Welcome slider dapat diuji dengan menggeser jari ke kiri/kanan atau menggunakan tombol/dots.
4. Jika belum login, Welcome Screen baru ditampilkan setelah login berhasil.

Parameter `reset=1` hanya membersihkan dua penanda preview sementara di sessionStorage:
- `tp_onboarding_preview_done`
- `tp_welcome_preview_done`

Parameter ini TIDAK menghapus:
- sesi Supabase / sesi login
- `tp_onboarding_seen`
- `tp_welcome_seen`
- profil, resep, preferensi, maupun data lokal aplikasi.

Untuk mengulangi pengujian, buka kembali URL dengan `reset=1`.
Untuk pemakaian normal, buka URL tanpa parameter preview.
