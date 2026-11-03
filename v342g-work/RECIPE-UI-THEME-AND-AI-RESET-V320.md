# Timer Proofer — Recipe UI, Brand Theme, and AI Reset Fix (V320)

Tanggal: 2026-10-30  
Versi produk yang terlihat: **V125**  
Revisi teknis: **V320**

## Ringkasan

V320 menangani empat permintaan UI/runtime tanpa mengganti ID DOM yang sudah ada:

1. **Tombol tutup detail resep** — `#btn-recipe-close-top` sekarang memakai `data-action="tutupHalamanResepSecaraAman"`, sehingga diproses oleh satu event delegation owner yang sudah aktif. Listener `DOMContentLoaded` khusus yang sebelumnya mengikat ID tombol tersebut dihapus agar tidak bergantung pada timing binding individual dan tidak membuat dua pemilik event.
2. **Warna brand** — tema dinamis cuaca sebelumnya mengubah `--accent` pada `:root` dan `body.style.background`. Saat cuaca hujan accent global menjadi biru (`#3498db`), yang ikut mewarnai banyak teks/tombol seluruh aplikasi. Sekarang warna dinamis hanya dipasang pada `#location-section`; warna brand aplikasi tetap cokelat `#4E342E` dan oranye `#E67E22`. `--text-dark` dan teks rekomendasi AI juga diarahkan ke cokelat brand.
3. **Reset hasil analisis AI resep** — helper `resetRecipeAiAnalysisState()` menyembunyikan dan mengosongkan `#ai-live-result`, mengembalikan label/status tombol analisis, dan menaikkan epoch request.
4. **Melindungi editor dari hasil AI lama** — `mintaAnalisisAISungguhan()` mencocokkan epoch sebelum menampilkan respons, menangani error, maupun mengubah status tombol. Respons dari request resep terdahulu tidak dapat menimpa editor resep baru.

## Alur reset yang dilindungi

Helper reset dipanggil ketika:
- `bukaDetailResepBaru()` membuka lembar resep baru dari master view.
- `buatResepBaruForm()` memulai lembar baru dari tombol `+ Resep Baru` di editor (sesudah konfirmasi edit, bila diperlukan).
- `bukaDetailResepEksisting(resep)` membuka resep lain agar laporan resep sebelumnya tidak terbawa.

## Cache / PWA

- `version.json` dan `assets/js/version.json`: `releaseToken = 20261030-v320`.
- Nama cache Service Worker: `Timer-Proofing-v1.1.222`.
- Semua URL modul yang menggunakan token `20261027-v317` diperbarui ke `20261030-v320`.
- Versi produk yang ditampilkan tetap `V125`.

## Domain Vercel

Nama domain bukan ditentukan oleh file aplikasi atau `vercel.json`. Untuk mengembalikan domain stabil `timer-proofer.vercel.app`, buka Vercel Project **timer-proofer** → **Settings → Domains**, lalu tambahkan/assign `timer-proofer.vercel.app` ke **Production**. Pastikan production branch adalah `main`. Jangan assign hostname tersebut ke branch Preview `fix/v318-vercel-output-directory`. Jika domain sudah terpasang pada project/team lain, selesaikan konflik assignment melalui Dashboard terlebih dahulu.

URL Preview yang berakhiran `-git-<branch>-...vercel.app` dan URL deployment hash adalah alamat deployment individual, bukan pengganti alias Production yang stabil.

## File utama yang berubah

- `assets/js/app-core.js`
- `www/index.html`
- `www/sw.js`
- `version.json`
- `assets/js/version.json`
- Modul/tokens runtime terkait di `assets/js/`
- Tes kontrak tombol close dan regresi AI/theme di `tests/`

## Batas verifikasi

Paket lulus audit statis dan automated tests lokal. Pengujian klik aktual di browser/PWA/Android serta pengaturan alias domain memerlukan deployment/lingkungan Vercel milik pengguna; tidak diklaim sudah dilakukan dari lingkungan ini.
