# Timer Proofer V321 — Root Extract / AI Retry Recovery

1. Backup `C:\xampp\htdocs\proofing-donat-baru` atau commit perubahan yang belum disimpan terlebih dahulu.
2. Ekstrak isi ZIP langsung ke `C:\xampp\htdocs\proofing-donat-baru` (root repository), bukan ke subfolder V321.
3. **Jangan menghapus `.git`, `.env`, atau file lokal berisi konfigurasi rahasia.** Jika Windows meminta overwrite, pastikan backup sudah tersedia.
4. Jalankan PowerShell:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm test
git diff --check
git status --short
```

5. Tinjau `git status` dan staged diff. Jangan commit `.env`, API key, file pribadi, atau artefak lokal yang tidak terkait.
6. Push ke branch Preview yang Anda pakai, misalnya:

```powershell
git add .gitattributes api/ai-utils.js www/public/api/ai-utils.js www/index.html www/sw.js version.json assets/js www/assets/js tests AI-RETRY-RECOVERY-V321.md ROOT-EXTRACT-INSTRUCTIONS-V321.md QA-TEST-LOG-V321.txt RELEASE-SUMMARY-V321.txt
git diff --cached --check
git commit -m "V321: Retry transient Gemini errors for analysis and tips"
git push
```

Jika branch aktif bukan branch Preview yang dimaksud, pindah ke branch yang benar sebelum `git add`/`commit`.

7. Tunggu deployment Preview dari GitHub selesai, lalu cek header respons `X-AI-Backend-Revision: V321` pada `/api/ai-analyze` dan `/api/ai-tips`.
8. Uji satu analisis resep, satu pertanyaan tips, lalu uji Telemetry: sembunyikan/buka card tanpa refresh dan pastikan hasil lama tetap tampak. Tekan `muatUlangAnalisisAI` untuk meminta hasil Telemetry baru.

Versi produk yang terlihat tetap **V125**. V321 adalah revisi teknis backend/cache. Hasil tes lokal tidak menjamin Gemini live selalu tersedia.
