# Online Language Translation — V332

## Mengapa migrasi dilakukan

Rilis ini tidak lagi menggunakan Google Website Translator Widget. Mesin terjemahan halaman lama telah dihentikan dukungannya oleh Google sejak 1 Oktober 2026. Runtime kini menggunakan Cloud Translation Basic (v2) melalui API proxy server-side.

## Alur

1. Pengguna memilih bahasa melalui daftar bahasa yang sudah ada.
2. `lang-renderer.js` memeriksa katalog kode bahasa dari endpoint `/api/translate-languages` dan memberi label Online / Offline / Belum aktif.
3. `language-engine.js` memprioritaskan bahasa sumber Indonesia, paket offline yang tersedia, lalu Cloud Translation.
4. `cloud-translation-service.js` memperoleh access token Supabase dari sesi pengguna dan mengirim permintaan ke endpoint same-origin `/api/translate` (atau domain API produksi untuk Capacitor).
5. `api/translate.js` memverifikasi token Supabase dan meneruskan teks ke Google Cloud Translation Basic v2. API key provider hanya dibaca dari environment server.
6. `online-i18n.js` menerapkan hasil ke text node dan atribut aman; tidak menggunakan `innerHTML`.
7. String diterjemahkan disimpan di cache lokal per bahasa. Cache dibatasi jumlah entry dan total karakter.

## Perlindungan dan pemulihan

- Maksimal 128 item dan 18.000 Unicode code points per batch; satu string maksimal 5.000.
- Request memerlukan sesi Supabase valid.
- Rate limiter per pengguna dibatasi 24 permintaan per menit per instance fungsi serverless (best-effort; bukan pengganti kuota provider).
- Retry maksimal dua kali pada permintaan utama hanya untuk kegagalan jaringan/timeout/502/503/504. Error login, konfigurasi, bahasa tidak didukung, kuota, dan rate limit tidak di-retry.
- Terjemahan node dinamis memiliki satu retry tambahan yang dibatasi hanya untuk kegagalan sementara; tidak ada loop retry tanpa batas.
- Katalog bahasa di-cache di server satu jam dan di perangkat enam jam; cache perangkat yang kedaluwarsa maksimal tujuh hari hanya dipakai saat kegagalan sementara.
- Nama resep, bahan, foto, dan langkah produksi yang ditulis pengguna tidak diterjemahkan. Label statis/editor UI tetap dapat diterjemahkan.
- Kegagalan penerjemahan tidak mengubah preference bahasa yang tersimpan; bahasa sebelumnya dipulihkan.
- CORS kedua endpoint mengizinkan header Authorization untuk WebView Capacitor.

## Konfigurasi wajib sebelum bahasa online aktif

Pada Google Cloud project yang digunakan:

1. Aktifkan Cloud Translation API.
2. Aktifkan Billing.
3. Buat API key khusus server-side dan batasi key ke Cloud Translation API.
4. Tambahkan environment variable `GOOGLE_CLOUD_TRANSLATE_API_KEY` pada Vercel project `timer-proofer` untuk Preview dan Production.
5. Redeploy masing-masing environment setelah menyimpan variable.

Jangan menaruh key di HTML, JavaScript, Capacitor assets, Git, ZIP, atau mengirimkannya melalui chat. Endpoint akan memberikan `TRANSLATION_NOT_CONFIGURED` hingga variable terpasang.

## Biaya dan kontrol

Cloud Translation ditagihkan berdasarkan karakter teks yang dikirim untuk diterjemahkan. Periksa halaman harga terbaru pada Google Cloud sebelum mengaktifkan Billing; atur quota dan budget alert. Cache lokal mengurangi permintaan berulang pada perangkat yang sama, tetapi tidak menghilangkan biaya terjemahan pertama.

## Batas validasi

Pengujian otomatis menggunakan mock pada batas HTTP/provider. Di lingkungan build ini tidak tersedia access token pengguna, key Cloud Translation, atau deployment Vercel, sehingga belum dapat mengklaim smoke test provider live. Uji online sesungguhnya baru dapat dilakukan setelah konfigurasi Vercel selesai.
