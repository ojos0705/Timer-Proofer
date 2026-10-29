# Timer Proofer V318 — Root Extract / Vercel 404 Fix

Paket ini disusun agar isinya diekstrak LANGSUNG ke root repository lokal `proofing-donat-baru`.
Folder `.git` tidak disertakan dalam ZIP, sehingga repository lokal tetap dipertahankan.

## Sebelum mengganti file
1. Buka terminal di `C:\xampp\htdocs\proofing-donat-baru`.
2. Jalankan `git status --short` dan simpan/commit perubahan lokal yang belum dicommit.
3. Buat backup folder proyek atau branch sebelum mengekstrak.
4. Ekstrak isi ZIP ini langsung ke `proofing-donat-baru` dan pilih **Replace files in destination** bila diminta. Jangan membuat subfolder `Timer-Proofer-ES6-Modular-V318` di dalam repo.
5. Jalankan `npm ci`, lalu `npm test`.
6. Tinjau `git diff` dan `git status --short` sebelum commit/push.

## Perbaikan 404 Vercel
`www/index.html` adalah entrypoint aplikasi web. `vercel.json` menetapkan `outputDirectory: "www"` agar Vercel menyajikan isi `www/` sebagai situs statis, sedangkan direktori fungsi serverless `api/` tetap berada di root repository.

Pada Vercel, pastikan **Root Directory** menunjuk ke root repository `proofing-donat-baru` (bukan `www/public` atau subfolder lain). Root/Output Directory di dashboard seharusnya tidak diarahkan ke `www/public`. Konfigurasi `outputDirectory` dalam `vercel.json` mengoverride pengaturan Output Directory dashboard untuk deployment ini.

## Commit dan push dengan aman
```powershell
git status --short
git switch -c fix/v318-vercel-output-directory
npm ci
npm test
git diff --check
git add -A
git commit -m "Fix Vercel output directory and AI backend timeout"
git push -u origin fix/v318-vercel-output-directory
```

Setelah review/merge ke branch produksi yang dipakai Vercel, tunggu deployment selesai lalu uji URL `/` dan endpoint `/api/ai-analyze`, `/api/ai-telemetry`, `/api/ai-tips`. Untuk backend V318, respons endpoint AI seharusnya menyertakan header `X-AI-Backend-Revision: V318`.

## Catatan
- Label versi aplikasi tetap `V125`; V318 adalah versi teknis paket.
- File rahasia `.env` dan `.git` tidak disertakan dalam ZIP. Pertahankan environment variables di Vercel, jangan commit API key.
- Memperbaiki `outputDirectory` akan memperbaiki penyajian `www/index.html` jika 404 disebabkan output directory yang salah. Jika masih 404, periksa Root Directory, deployment yang sedang aktif, dan build logs.
