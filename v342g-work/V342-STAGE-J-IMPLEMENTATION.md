# V342 Stage J — Sandbox Certification Harness & Production Readiness

## Tujuan
Stage J menambahkan pemeriksaan read-only untuk memverifikasi satu transaksi Midtrans Sandbox yang sudah berhasil dibayar melalui UI aplikasi. Pemeriksaan membandingkan status provider, order pada API aplikasi untuk akun yang sama, dan entitlement paket. Pemeriksaan ini tidak membuat transaksi, tidak mengubah database, dan tidak dapat diarahkan ke Midtrans Production.

## Perubahan
- `scripts/monetization-sandbox-smoke-utils.mjs`: orkestrasi pemeriksaan live dengan dependency injection untuk pengujian.
- `scripts/monetization-sandbox-smoke.mjs`: runner CLI yang tidak mencetak key atau bearer token.
- `tests/monetization-sandbox-smoke-v342j.test.mjs`: pengujian konfigurasi sandbox, validasi order/provider/IDR/nominal, status pembayaran, entitlement paket yang cocok, serta read-only guarantee.
- `package.json`: perintah `npm run test:monetization-sandbox`.

## Pemeriksaan yang dilakukan
1. `MIDTRANS_IS_PRODUCTION` wajib bernilai eksplisit `false`.
2. Server Key wajib berawalan `SB-`; endpoint provider dipatok ke `https://api.sandbox.midtrans.com`.
3. Base URL aplikasi harus HTTPS publik.
4. Mengambil status order dari Midtrans Get Status API dan mencocokkan order ID, currency IDR, nominal, serta status paid.
5. Mengambil `/api/payment-status` dengan bearer token akun uji dan mencocokkan order, nominal, mata uang, serta status paid.
6. Mengambil `/api/my-entitlements` dengan bearer token akun uji dan memastikan entitlement aktif berasal dari `plan_id` order tersebut.
7. Hasil sukses hanya melaporkan metadata order yang aman. Secret key dan bearer token tidak dimasukkan ke output.

## Menjalankan pemeriksaan live
Jalankan dari lingkungan lokal yang aman atau runner CI rahasia. Jangan menaruh secret di command line, file yang dikomit, HTML, Capacitor config, atau log.

Variabel lingkungan yang diperlukan:
- `MIDTRANS_IS_PRODUCTION=false`
- `MIDTRANS_SERVER_KEY` — Sandbox Server Key (`SB-...`)
- `MONETIZATION_SANDBOX_BASE_URL` — URL HTTPS deployment Preview/staging yang memakai konfigurasi sandbox
- `MONETIZATION_SANDBOX_USER_ACCESS_TOKEN` — access token akun Supabase khusus pengujian
- `MONETIZATION_SANDBOX_ORDER_ID` — Order ID aplikasi dari transaksi sandbox yang sudah berhasil diselesaikan melalui simulator

Perintah:

```bash
npm run test:monetization-sandbox
```

Runner melakukan GET saja ke Midtrans, `/api/payment-status`, dan `/api/my-entitlements`. Exit code `0` berarti ketiga sumber sepakat untuk order uji tersebut. Exit code `2` berarti pemeriksaan diblokir atau belum memenuhi kriteria.

## Prosedur sandbox end-to-end merchant
1. Gunakan Supabase staging terpisah; terapkan migrasi V341 sampai V342H sesuai urutan.
2. Deploy branch ke Vercel Preview/staging dan atur seluruh variabel monetisasi dengan Sandbox Server Key serta `MIDTRANS_IS_PRODUCTION=false`.
3. Pastikan Supabase staging, bukan project produksi, yang digunakan oleh deployment.
4. Atur Payment Notification URL di Midtrans MAP Sandbox ke `https://<deployment>/api/midtrans-notification`.
5. Buat akun uji terpisah, pilih Lite/Pro, dan pastikan nominal Snap sama dengan katalog server.
6. Selesaikan pembayaran melalui simulator Midtrans Sandbox.
7. Pastikan webhook diterima, order menjadi `paid`, dan entitlement aktif untuk `plan_id` yang sama.
8. Jalankan smoke runner di atas menggunakan Order ID dan access token akun uji.
9. Ulangi untuk paket lain. Uji juga pending, deny, challenge, expire, duplicate notification, refund, dan akses lintas akun secara manual pada staging.
10. Catat Order ID, waktu UTC, versi deployment, hasil webhook, dan hasil smoke tanpa menyimpan secret atau data kartu.

Midtrans menyatakan Sandbox digunakan untuk transaksi pengujian tanpa pembayaran dana nyata dan menyediakan simulator untuk mensimulasikan respons provider. Referensi: https://docs.midtrans.com/docs/testing-payment-on-sandbox dan https://docs.midtrans.com/docs/snap-snap-integration-guide.

## Gerbang sebelum production
- Sandbox smoke runner PASS untuk minimal satu transaksi Lite dan satu Pro.
- Webhook URL publik HTTPS aktif; signature dan Get Status diverifikasi.
- Duplicate notification tidak membuat entitlement ganda atau memperpanjang masa aktif berulang.
- Uji pending/deny/challenge/expire/refund/partial refund selesai.
- Kebijakan bisnis `partial_refund` disetujui tertulis. Saat ini status `partial_refund` dipetakan menjadi `refunded` dan akses dicabut; jangan mengubahnya tanpa keputusan produk/keuangan.
- RLS/grants/RPC diuji pada Supabase staging nyata.
- Payout CSV aktual diuji dengan parser Stage H.
- Legal terms, kebijakan refund, dukungan pelanggan, dan pencatatan keuangan disetujui.
- Produksi hanya diaktifkan melalui perubahan konfigurasi yang disengaja dan terpisah; jangan mengubah `MIDTRANS_IS_PRODUCTION` pada tahap sertifikasi sandbox.

## Status sertifikasi pada paket ini
Automated tests dan static release checks dijalankan lokal. Tidak ada kredensial merchant Sandbox atau deployment staging yang diberikan pada sesi ini, sehingga tidak ada transaksi live, webhook eksternal, migrasi Supabase, atau browser/device E2E yang dijalankan. Karena itu paket ini menyediakan harness dan prosedur, **bukan klaim sertifikasi live**.

## Batasan
- Runner hanya memeriksa satu order sukses yang sudah dibayar; tidak membuat order atau menjalankan simulator.
- Runner tidak menguji browser Snap popup, Android/iOS WebView, notifikasi webhook eksternal, atau seluruh metode pembayaran.
- Runner mensyaratkan entitlement akun uji saat ini menunjuk paket yang sama dengan order; gunakan akun uji khusus agar paket aktif lain tidak mengganggu hasil.
- Partial refund tetap merupakan keputusan kebijakan bisnis yang belum disahkan.

## Versi
Technical stage: V342 Stage J. Product-facing version tetap V125.
