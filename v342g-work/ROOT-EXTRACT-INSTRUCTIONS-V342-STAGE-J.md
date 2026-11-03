# Petunjuk Root-Extract — V342 Stage J

1. Cadangkan proyek dan database staging terlebih dahulu.
2. Ekstrak seluruh isi ZIP langsung ke root repository Timer-Proofer (jangan membuat folder pembungkus tambahan).
3. Jangan menimpa `.env`, `.env.local`, kredensial, konfigurasi deployment, atau file lokal rahasia.
4. Jalankan `npm ci` bila lockfile berubah/tidak ada di mesin, kemudian `npm test`.
5. Untuk pemeriksaan live, isi variabel sandbox hanya melalui secret manager atau environment lokal yang tidak dikomit:
   - `MIDTRANS_IS_PRODUCTION=false`
   - `MIDTRANS_SERVER_KEY=SB-...`
   - `MONETIZATION_SANDBOX_BASE_URL=https://<preview-staging-url>`
   - `MONETIZATION_SANDBOX_USER_ACCESS_TOKEN=<test-user-access-token>`
   - `MONETIZATION_SANDBOX_ORDER_ID=<paid-sandbox-order-id>`
6. Jalankan `npm run test:monetization-sandbox` setelah transaksi berhasil diselesaikan melalui simulator Midtrans.
7. Jangan jalankan pemeriksaan terhadap URL/credential produksi. Runner sengaja menolak `MIDTRANS_IS_PRODUCTION=true` dan key tanpa prefix Sandbox.
8. Migrasi Supabase Stage B–H harus diterapkan ke project staging secara terpisah dan diverifikasi sebelum pengujian merchant.

Paket ini tidak menjalankan deployment, migrasi database, atau transaksi live secara otomatis.
