# Timer Proofer V319 — Root Extract / Gemini Deadline Fix

Paket ini disusun agar isinya diekstrak langsung ke root repository lokal `proofing-donat-baru`. Folder `.git` tidak disertakan sehingga repository lokal tetap dipertahankan.

## Sebelum mengganti file
1. Buka terminal di `C:\xampp\htdocs\proofing-donat-baru`.
2. Jalankan `git status --short` dan simpan perubahan lokal yang belum dicommit.
3. Buat backup folder/branch sebelum mengekstrak.
4. Ekstrak isi ZIP langsung ke `proofing-donat-baru`; jangan membuat subfolder tambahan. Pilih replace untuk file yang memang bagian dari paket.
5. Jalankan `npm ci`, `npm test`, dan `git diff --check`.
6. Tinjau `git status --short` serta diff sebelum commit.

## Perbaikan AI V319
V318 mengembalikan provider error `Manually set deadline 6s is too short. Minimum allowed deadline is 10s.` V319 meningkatkan batas tiap pemanggilan provider menjadi 11 detik dan membatasi keseluruhan upaya provider/fallback menjadi 26 detik, di bawah timeout request frontend 30 detik. File `api/ai-utils.js` dan `www/public/api/ai-utils.js` disinkronkan.

Sesudah commit/push dan deployment Preview baru:
- Periksa respons endpoint membawa `X-AI-Backend-Revision: V319`.
- Uji `/api/ai-telemetry` dan `/api/ai-tips`.
- Pastikan log tidak lagi berisi error deadline 6 detik. Jika masih gagal, gunakan status/message terbaru untuk diagnosis selanjutnya.

## Git
```powershell
git status --short
npm ci
npm test
git diff --check
git add -A
git commit -m "Fix Gemini provider minimum deadline"
git push
```

Jika belum ada upstream untuk branch aktif, gunakan `git push -u origin <nama-branch-aktif>`. Pastikan branch tersebut adalah branch yang ditautkan ke deployment Preview. Setelah validasi Preview, gabungkan ke branch produksi jika sesuai.

Catatan: label versi produk tetap V125; V319 hanya revisi teknis backend. Jangan commit `.env` atau API key. Pengujian lokal tidak menguji layanan Gemini live atau akun Vercel.
