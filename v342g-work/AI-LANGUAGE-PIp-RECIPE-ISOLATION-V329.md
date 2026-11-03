# V329 — AI Telemetry, Language Loader, Recipe AI Isolation, Android PiP

## Ringkasan

V329 adalah revisi teknis. Nomor produk yang terlihat pengguna tetap V125.

### AI Telemetry
- Menetapkan kontrak tujuh bagian dengan judul dan urutan tetap.
- Konten evaluasi tetap disesuaikan dengan `productKey`: `donat`, `roti`, `bakpao`, `pizza`, `salt_bread`.
- Pemilihan produk menggunakan `data-product` kanonis, bukan `innerText` tombol yang dapat berbeda karena emoji/label platform.
- Backend mengirim `X-AI-Backend-Revision: V329`.
- Sinkronisasi `api/` ke `www/public/api/` dilakukan oleh `scripts/sync-web-assets.mjs`.

### Google Translate / Abkhaz
- Loader sekarang menunggu `select.goog-te-combo` dan daftar opsi bahasa benar-benar muncul; callback SDK saja tidak dianggap sukses.
- Bila SDK sudah terpasang tetapi dropdown belum dirender, adapter menginisialisasi ulang dan tetap dapat dicoba ulang.
- Saat online, modal pemilihan bahasa tetap terbuka selama proses memuat.
- Kegagalan online tidak menyimpan bahasa sebagai `user_lang_pending`; label bahasa sebelumnya dipulihkan dan pengguna dapat mencoba lagi.
- Kode bahasa Abkhaz `ab` sudah tersedia dalam `lang-data.js`.

### AI Analysis per resep
- Reset hasil dilakukan ketika editor kembali ke `recipe-master-view`.
- Setiap request membawa identitas resep dan epoch. Respons yang datang terlambat dari resep lain tidak ditampilkan.
- AI Analysis tetap menggunakan formatter dan endpoint yang sama.

### AI Assistant Card
- Input dan tombol dapat membungkus pada layar kecil.
- Status loading dipendekkan menjadi `⏳ Menganalisis…` agar tidak meluber keluar card.

### Android PiP
- Back Activity, bridge Capacitor, dan `onUserLeaveHint` menggunakan satu helper native untuk meminta system PiP.
- Request PiP dibuat idempotent dan memeriksa apakah Activity sudah berada di PiP.
- Setelah Activity dipin, Android diminta menampilkan Home launcher pada tindakan Back yang sama, sehingga PWA/Chrome yang sebelumnya terbuka tidak tertinggal sebagai layar penuh di belakang PiP.
- Manifest mempertahankan `supportsPictureInPicture`, `resizeableActivity`, dan `singleTask`.

## Batas pengujian

- PWA/Android WebView dan Google Translate live memerlukan pengujian online pada perangkat nyata.
- System PiP dan perpindahan ke Home memerlukan build APK dan uji HP. Tes source tidak dapat membuktikan perilaku OEM/launcher secara fisik.
- AI Telemetry menggunakan satu kontrak format, tetapi isi rekomendasi tetap berbeda sesuai profil produk dan respons model.
