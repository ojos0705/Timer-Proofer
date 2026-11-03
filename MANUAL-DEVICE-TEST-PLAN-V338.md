# Manual Device Test Plan — V338

## Android APK

1. Ekstrak V338 ke root proyek, pertahankan `.git`, `.env`, `.env.local`, dan `android/local.properties`.
2. Jalankan `npm ci`, `npm test`, dan `npm run sync:android`.
3. Jalankan `:app:assembleDebug` dan `:app:installDebug`.
4. Buka Pengaturan → Bagikan ke Teman → Bagikan melalui aplikasi.
5. Pastikan Android Sharesheet menampilkan URL yang benar dan judul preview `Timer Proofer & Kalkulator HPP` (perangkat/versi Android dapat berbeda dalam tata letak).
6. Uji penerima WhatsApp, Gmail, Telegram, dan aplikasi lain yang tersedia. Pastikan URL tetap terbawa bersama pesan.
7. Kembali ke Bagikan ke Teman → Bagikan tautan saja. Pastikan `EXTRA_TEXT` hanya berisi URL dan judul preview tetap muncul.
8. Tutup chooser tanpa memilih aplikasi; pastikan aplikasi tidak menampilkan error palsu.
9. Uji Salin tautan dan pastikan hasil tepat `https://timer-proofer.vercel.app/`.

## PWA

1. Uji tombol Bagikan melalui aplikasi di Chrome desktop dan Android browser.
2. Pastikan jalur Web Share API tetap dipakai dan payload URL tidak berubah.

## Expected platform behavior

- Android menampilkan Android Sharesheet; Chrome/Windows menampilkan Windows Share Sheet.
- Rekomendasi aplikasi dan kontak disuplai oleh sistem operasi, bukan daftar yang dikodekan oleh aplikasi.
- QR code bukan fitur konsisten lintas Android/OEM; tidak dijadikan kriteria lulus V338.
