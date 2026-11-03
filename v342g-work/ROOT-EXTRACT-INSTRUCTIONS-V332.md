# Petunjuk Root-Extract dan Pengujian — V332

## 1. Backup dan ekstraksi

1. Buka `C:\xampp\htdocs\proofing-donat-baru`.
2. Simpan perubahan lokal yang belum dicommit dan buat backup folder/branch.
3. Ekstrak seluruh isi ZIP ini langsung ke root repository, bukan ke folder V332 tambahan.
4. Jangan menimpa atau menghapus `.git`, `.env`, `.env.local`, `android/local.properties`, file signing, atau kredensial lokal.

## 2. Pemeriksaan source

Jalankan PowerShell:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm ci
npm test
git diff --check
git status --short
```

Tinjau seluruh file yang berubah. Pastikan tidak ada `.env`, key Cloud Translation, access token, password, atau rahasia lain masuk ke staging.

## 3. Aktifkan layanan terjemahan online (wajib untuk online)

Source V332 menggunakan Google Cloud Translation Basic v2 melalui backend, bukan Google Website Translator Widget.

1. Di Google Cloud Console, pilih project, aktifkan **Cloud Translation API**, dan aktifkan Billing.
2. Buat API key baru untuk backend. Pada API restrictions, batasi key hanya ke **Cloud Translation API**.
3. Di Vercel → project `timer-proofer` → Settings → Environment Variables, tambahkan:

   - Name: `GOOGLE_CLOUD_TRANSLATE_API_KEY`
   - Value: API key server-side Anda
   - Environments: Preview dan Production (pilih keduanya atau tambahkan terpisah).

4. Simpan lalu redeploy Preview dan Production agar environment variable masuk ke deployment baru.
5. Jangan memasukkan key ke source code, file `.env` yang dikirim, HTML, JavaScript, APK, atau Git. Jangan mengirim key melalui chat.
6. Jika variable belum ada, endpoint sengaja mengembalikan `TRANSLATION_NOT_CONFIGURED`; bahasa offline tetap tersedia.

Sebelum Billing diaktifkan, periksa harga Cloud Translation dan tetapkan quota serta budget alert di Google Cloud. Cache mengurangi permintaan berulang, tetapi terjemahan baru tetap dapat dikenakan biaya.

## 4. Sinkronisasi dan build APK

Setelah konfigurasi source selesai:

```powershell
npm run sync:android
cd android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug
```

Gunakan USB debugging dan izinkan laptop pada dialog Android. Ejaan task Gradle yang benar adalah `assembleDebug`.

## 5. Git dan deployment

Push perubahan ke branch Preview yang sedang digunakan, lalu uji deployment Preview sebelum merge ke `main`. Jangan melakukan commit key/provider secret.

## 6. Uji manual wajib

### App Tour
- Buka tour hingga langkah 1–5.
- Bandingkan bentuk highlight langkah 1–3 dengan langkah 4 (Resep) dan 5 (Tips).
- Pastikan target highlight tidak tertutup navbar/overlay.
- Uji Next, Previous, Skip, Back Android, dan penyelesaian tour.
- Buka ulang tour dari menu bantuan dan pastikan stacking layer selalu dibersihkan.

### Bahasa online dan offline
- Login dan pastikan bahasa bertanda Online tampil setelah katalog berhasil diperiksa.
- Pilih satu bahasa yang dikonfirmasi tersedia oleh katalog Cloud Translation; pastikan status berubah ke Aktif · Online.
- Uji bahasa `ab` hanya jika kode tersebut muncul pada katalog provider. Jangan mengasumsikan dukungannya.
- Ubah bahasa beberapa kali, kembali ke Indonesia, lalu pilih ulang bahasa sebelumnya; pastikan cache digunakan dan tidak ada terjemahan bertumpuk.
- Tambahkan/buka UI dinamis seperti modal, tab Resep, dan Tips; periksa label UI baru.
- Pastikan nama resep, bahan, foto, dan langkah produksi pengguna tidak diterjemahkan.
- Uji offline: online translation tidak boleh dilaporkan berhasil; paket offline yang tersedia tetap berfungsi.
- Uji token kedaluwarsa, provider quota, konfigurasi belum ada, dan timeout; pesan error harus jelas dan bahasa sebelumnya tetap aktif.

### Regression aplikasi
- Uji login/logout, AI Telemetry, AI Analyze, AI Tips, timer, notifikasi, sinkronisasi resep, dan PiP Android.

Pengujian otomatis tidak menggantikan pengujian di perangkat fisik dan provider live.
