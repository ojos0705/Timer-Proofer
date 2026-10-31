# Petunjuk pemasangan V323

1. Cadangkan perubahan lokal dan jangan hapus folder `.git` atau `.env`.
2. Ekstrak isi ZIP langsung ke root repository:
   `C:\xampp\htdocs\proofing-donat-baru`
   Jangan membuat folder pembungkus baru.
3. Buka PowerShell:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
npm test
git diff --check
git status --short
```

4. Pastikan tidak ada `.env`, API key, password, atau file rahasia yang akan dikirim.
5. Stage, tinjau, commit, dan push ke branch Preview:

```powershell
git add -A
git diff --cached --check
git status
# Tinjau Changes to be committed, jangan ketik frasa itu sebagai perintah.
git commit -m "V323: Fix location shrink and saved recipe premium print"
git push origin fix/v318-vercel-output-directory
```

6. Verifikasi deployment Preview. Uji scroll turun/naik dan tombol Print pada resep tersimpan. Setelah lolos, merge ke `main` untuk Production.

Versi produk tetap V125. V323 adalah revisi teknis; cache Service Worker `Timer-Proofing-v1.1.225`.
