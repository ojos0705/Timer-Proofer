# Alur kerja bahasa (online + offline)

Folder `tools/` harus SEJAJAR dengan `public/` — jangan dimasukkan ke dalam `public/` (ikut ter-deploy & ter-bundle ke APK).

## Setiap kali teks UI berubah
1. `node tools/extract-i18n.js public/index.html`            → memperbarui `tools/data/_source.id.json`
2. Teks dinamis (angka/nama dibuat lewat JS) → tulis sebagai templat di `tools/data/_extra.id.json`, mis. `"{0} XP menuju Level {1}"`
3. `node tools/extract-i18n.js public/index.html --check en`  → daftar string yang belum ada terjemahan Inggrisnya

## Membuat paket offline untuk semua bahasa (perlu Google Cloud Translation API key)
```
set GOOGLE_API_KEY=xxxx                              (PowerShell: $env:GOOGLE_API_KEY="xxxx")
node tools/generate-packs.js --dry-run               cek dukungan bahasa + estimasi biaya (gratis)
node tools/generate-packs.js --prune --bump-sw       terjemahkan, hapus paket kerangka, naikkan CACHE_NAME sw.js
```
Aman diulang. `en.json` (buatan tangan) tidak ditimpa. Setelah selesai: deploy, buka app sekali saat online
(service worker mengunduh semua paket ke cache), lalu bahasa ✓ Offline bisa dipilih tanpa internet.

## Mencari teks yang belum terjemah
Di konsol browser: `localStorage.setItem('i18n_debug','1')`, muat ulang, pilih bahasa non-Indonesia, jelajahi app,
lalu jalankan `OfflineI18n.missing()`. Tambahkan hasilnya ke `_extra.id.json` (templat bila ada angka/nama).
