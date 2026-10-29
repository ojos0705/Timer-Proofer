# Rencana QA Manual — V299

Sebelum produksi, verifikasi di browser staging dan perangkat sasaran:

1. Buka Notifikasi; klik Baca Semua dan pastikan badge turun ke nol serta status terbaca bertahan setelah reload.
2. Klik Hapus Semua lalu batalkan; riwayat harus tetap utuh. Ulangi dan konfirmasi; riwayat dan badge harus kosong.
3. Muat ulang aplikasi beberapa kali; pastikan tidak muncul notifikasi contoh atau klaim GPS/izin push yang tidak terjadi.
4. Uji filter, hapus satu notifikasi, penutupan modal, fokus, dan scroll.
5. Uji Pengaturan, login/daftar/consent/logout, dan semua aksi kalkulator resep.
6. Jalankan timer, reload/pindah latar, dan uji pemulihan, alarm, getaran, dan notifikasi native.
7. Jalankan harness foto melalui HTTPS/localhost; periksa byte, metadata, slot, dan isolasi owner IndexedDB.
8. Buat/edit/hapus resep dan unggah/ganti/pulihkan/hapus foto lintas slot/akun.
9. Ekspor PDF pada desktop dan mobile.
10. Instal PWA; uji offline/online, cold start, update SW, dan kegagalan jaringan.
11. Uji pembayaran di sandbox; ulangi alur utama pada Android dan iPhone/iPad fisik. Catat model, OS, browser/WebView, build, hasil, dan log.

Dokumen ini rencana, bukan bukti validasi browser/perangkat.
