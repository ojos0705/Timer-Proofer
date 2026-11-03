# Rencana QA Manual — V300

## Persiapan build

1. Jalankan `npm install`.
2. Jalankan `npm run build:web` dan pastikan pemeriksaan aset precache berhasil.
3. Jalankan `npm run sync:android` sebelum membuka Android Studio atau membangun APK.
4. Bangun APK pada mesin yang memiliki Android SDK, Java, dan Gradle distribution yang diperlukan.

## Login dan registrasi Android

1. Jalankan APK V300 pada perangkat fisik dan pastikan layar login muncul tanpa blank screen.
2. Catat Logcat sejak cold start; periksa error `Unable to open asset URL`, `Failed to fetch dynamically imported module`, MIME JavaScript, dan `__TP_BOOT_ERROR__`.
3. Pindah tab Masuk/Daftar dan pastikan tombol serta field berubah sesuai mode.
4. Uji login dengan akun yang valid dan kredensial salah; pastikan pesan error terlihat dan tombol dapat digunakan kembali.
5. Uji registrasi dengan email baru, password yang memenuhi kebijakan, serta persetujuan syarat; verifikasi alur email sesuai konfigurasi Supabase.
6. Uji koneksi terputus saat startup lalu pulih, session persistence setelah aplikasi ditutup/dibuka, logout, dan login kembali.
7. Jangan menyalin access token, refresh token, password, atau secret ke laporan. Catat kode error, status HTTP, endpoint/domain, waktu, versi aplikasi, model perangkat, dan versi Android.

## Regresi UI dan fitur

- Pengaturan dan Notifikasi membuka modal; Baca Semua/Hapus Semua sesuai konfirmasi.
- Kalkulator resep, penyimpanan bahan, foto resep, ekspor PDF, timer, alarm, notifikasi native, dan tombol Back.
- Instalasi PWA, cold start, offline/online, pembaruan Service Worker, serta kegagalan jaringan.
- Pembayaran hanya pada sandbox.
- Ulangi jalur utama di browser desktop, PWA terinstal, Android fisik, dan iOS fisik.

Dokumen ini adalah rencana pengujian, bukan bukti bahwa tes manual sudah dilakukan.
